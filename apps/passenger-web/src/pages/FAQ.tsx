import React from 'react';

// Define types for our FAQ data
interface FAQItem {
  question: string;
  answer: string;
}

const FAQ = () => {
  const faqs: FAQItem[] = [
    {
      question: "How do I signup for TaxiLibre?",
      answer: "Download the app or visit our website, click 'Sign Up', and follow the prompts to create your account."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept credit/debit cards, PayPal, Apple Pay, Google Pay, and cash (where available)."
    },
    {
      question: "How is the fare calculated?",
      answer: "Fare is based on distance, time, and demand. You'll see an estimated fare before confirming your ride."
    },
    {
      question: "Can I schedule a ride in advance?",
      answer: "Yes! You can schedule rides up to 30 days in advance using the 'Schedule' option in the app."
    },
    {
      question: "How do I rate my driver?",
      answer: "After each ride, you'll be prompted to rate your driver from 1 to 5 stars and leave optional feedback."
    },
    {
      question: "What if I leave an item in the vehicle?",
      answer: "Contact our support team through the app with your ride details, and we'll help you retrieve lost items."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h1>
        <p className="text-gray-600 mb-6">
          Find quick answers to common questions about using TaxiLibre.
        </p>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md">
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900">{faq.question}</h3>
                <p className="text-gray-700 mt-2">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
