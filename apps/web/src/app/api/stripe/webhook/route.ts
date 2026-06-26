import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import prisma from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' })

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      const invoiceId = session.metadata?.invoiceId
      if (invoiceId) {
        await prisma.payment.create({
          data: {
            organizationId: session.metadata?.organizationId!,
            invoiceId,
            amount: (session.amount_total ?? 0) / 100,
            currency: session.currency?.toUpperCase() ?? 'USD',
            method: 'stripe',
            status: 'completed',
            stripePaymentId: session.payment_intent as string,
            paidAt: new Date(),
          },
        })
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'paid',
            paidAt: new Date(),
            amountPaid: { increment: (session.amount_total ?? 0) / 100 },
            amountDue: { decrement: (session.amount_total ?? 0) / 100 },
          },
        })
        await prisma.notification.create({
          data: {
            organizationId: session.metadata?.organizationId!,
            userId: session.metadata?.userId!,
            type: 'payment_received',
            title: 'Payment Received 🎉',
            body: `Payment of $${((session.amount_total ?? 0) / 100).toFixed(2)} received`,
            entityType: 'invoice',
            entityId: invoiceId,
          },
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          status: sub.status,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: 'canceled' },
      })
      break
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice
      const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: inv.subscription as string },
        include: { organization: true },
      })
      if (subscription) {
        await prisma.notification.create({
          data: {
            organizationId: subscription.organizationId,
            userId: 'system',
            type: 'payment_failed',
            title: 'Payment Failed',
            body: 'Your subscription payment failed. Please update your payment method.',
            entityType: 'subscription',
            entityId: subscription.id,
          },
        })
      }
      break
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
