import Stripe from "stripe";

class StripePaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      // @ts-ignore
      apiVersion: "2023-08-16",
    });
  }

  async initiatePayment(context) {
    const { amount, currency, metadata, userId } = context;

    // Get or create a Stripe customer
    const customer = await this.getOrCreateStripeCustomer(userId);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      customer: customer?.id,
      // payment_method_types: ["card"],
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    };
  }

  async retrievePayment(paymentIntentId: string) {
    return await this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string,
    returnUrl: string
  ) {
    return await this.stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
      return_url: returnUrl,
    });
  }

  async capturePayment(paymentData) {
    return await this.stripe.paymentIntents.capture(
      paymentData.paymentIntentId
    );
  }

  async refundPayment(paymentData) {
    return await this.stripe.refunds.create({
      payment_intent: paymentData.paymentIntentId,
    });
  }

  async deletePayment(paymentData) {
    await this.stripe.paymentIntents.cancel(paymentData.paymentIntentId);
  }

  async getOrCreateStripeCustomer(userId) {
    try {
      // Try to get existing customer
      return await this.stripe.customers.retrieve(userId);
    } catch (error) {
      // If customer doesn't exist, create a new one
      return await this.stripe.customers.create({
        // @ts-ignore
        id: userId, // Optional, but helpful if you want the IDs to match
        metadata: { userId: userId },
      });
    }
  }

  async attachPaymentMethodToCustomer(paymentMethodId: string, userId: string) {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: userId,
    });

    // Optional: set as default payment method
    await this.stripe.customers.update(userId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return true;
  }


  // Update customer card details (for both card and payment methods)
  async updateCustomerPaymentMethodDetails(
    userId: string,
    paymentMethodId: string,
    updateData: { name?: string; exp_month?: number; exp_year?: number; metadata?: any }
  ) {
    // Update the payment method metadata, expiration date, etc.
    const updatedPaymentMethod = await this.stripe.paymentMethods.update(paymentMethodId, {
      metadata: updateData.metadata,
      card: {
        exp_month: updateData.exp_month,
        exp_year: updateData.exp_year,
      },
      billing_details: {
        name: updateData.name,
      },
    });

    return updatedPaymentMethod;
  }

  // Method to fetch payment cards with pagination
  async getCustomerPaymentCards(userId: string, limit: number, offset?: string | null) {
    try {

      const startingAfter = offset ? offset : undefined; 
  

      const paymentCards = await this.stripe.customers.listSources(userId, {
        limit: limit,  
        starting_after: startingAfter,  
        object: "card", 
      });
  
      return {
        data: paymentCards.data,  
        has_more: paymentCards.has_more,  
        next_offset: paymentCards.data.length > 0 ? paymentCards.data[paymentCards.data.length - 1].id : null,  // Next offset (ID of last card)
      };
    } catch (error) {
      throw new Error(`Error fetching payment cards: ${error.message}`);
    }
  }
  
  


// Method to fetch payment methods with pagination
async getCustomerPaymentMethods(userId: string, limit: number, offset: number) {
  try {
   
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: userId,
      type: 'card',
      limit: limit + offset,  
    });

    // Slice the results to apply the offset (pagination)
    const slicedData = paymentMethods.data.slice(offset, offset + limit);

    return {
      data: slicedData,
      count: paymentMethods.data.length,  // Total count of payment methods available
    };
  } catch (error) {
    throw new Error(`Error fetching payment methods: ${error.message}`);
  }
}

  
  

  async addCustomerPaymentCard(userId: string, cardToken: string) {
    return await this.stripe.customers.createSource(userId, {
      source: cardToken,
    });
  }

  // For PaymentMethods delete
async deleteCustomerPaymentCard(paymentMethodId: string) {
  return await this.stripe.paymentMethods.detach(paymentMethodId);
}

// For Source-based legacy cards:
async deleteCustomerCardSource(customerId: string, cardId: string) {
  return await this.stripe.customers.deleteSource(customerId, cardId);
}

// Unified method (optional)
async deleteCard(customerId: string, cardId: string) {
  if (cardId.startsWith("card_")) {
    return await this.stripe.customers.deleteSource(customerId, cardId);
  } else if (cardId.startsWith("pm_")) {
    return await this.stripe.paymentMethods.detach(cardId);
  } else {
    throw new Error("Unsupported card ID format");
  }
}

// For legacy cards added via token (card_...)
async updateCustomerCardDetails(
  customerId: string,
  cardId: string,
  updates: {
    name?: string;
    exp_month?: number;
    exp_year?: number;
    metadata?: Record<string, string>;
  }
) {
  const updatePayload: any = {
    ...updates,
  };

  // Convert exp_month and exp_year to strings if provided
  if (updates.exp_month) {
    updatePayload.exp_month = String(updates.exp_month);
  }
  if (updates.exp_year) {
    updatePayload.exp_year = String(updates.exp_year);
  }

  return await this.stripe.customers.updateSource(customerId, cardId, updatePayload);
}



}

export default StripePaymentService;
