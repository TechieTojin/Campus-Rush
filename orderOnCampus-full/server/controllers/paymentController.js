const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

exports.paymentIntent = async (req,res) => {
    const { amount } = req.body
    console.log("amount",amount)
    try {
        //create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount*100,
            description: "some description",
            currency: 'inr',
            automatic_payment_methods: {
                enabled: true
            },
            shipping: {
                name: 'Jenny Rosen',
                address: {
                  line1: '510 Townsend St',
                  postal_code: '688539',
                  city: 'Kochi',
                  state: 'KL',
                  country: 'IND',
                },
              },
        })
        res.json({ paymentIntent: paymentIntent.client_secret });
    } catch (e) {
        res.status(500).send(`Error creating Payment Intent ${e}`);
    }
}