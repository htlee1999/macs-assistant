export async function generateMcDonaldsFAQQuestions() {
  // Define questions based on the categories and sections in the CSV
  const questions = [
    // Food Category Questions
    {
      category: "Food",
      section: "Nutri-Grade",
      question: "Why don't my Frappes come with whipped cream anymore?",
      messageTemplate: "I ordered a Mocha Frappe yesterday and noticed it didn't have any whipped cream. When did this change happen?"
    },
    {
      category: "Food",
      section: "Nutri-Grade",
      question: "Can I request to add whipped cream to my Frappe as an add-on?",
      messageTemplate: "I really miss having whipped cream on my Frappe. Is there any way I can pay extra to add it?"
    },
    {
      category: "Food",
      section: "Nutri-Grade",
      question: "Why does the Iced Latte taste different now?",
      messageTemplate: "I've been getting Iced Lattes from McDonald's for years, but they taste different now. They're not sweet anymore. What changed?"
    },
    {
      category: "Food",
      section: "General",
      question: "What vegetarian options do you offer?",
      messageTemplate: "I'm looking to reduce my meat consumption. What vegetarian-friendly items do you have on your menu?"
    },
    {
      category: "Food",
      section: "General",
      question: "Can I request full-cream milk instead of low-fat milk in my coffee?",
      messageTemplate: "I prefer the taste of full-cream milk in my coffee. Is it possible to request this for my McCafé drinks?"
    },
    
    // The McDonald's App Questions
    {
      category: "The McDonald's app",
      section: "Mobile Ordering via My McDonald's App",
      question: "How do I use the McDonald's App to place an order?",
      messageTemplate: "I just downloaded the McDonald's App but I'm not sure how to place an order. Can you walk me through the process?"
    },
    {
      category: "The McDonald's app",
      section: "Mobile Ordering via My McDonald's App",
      question: "How do I know when my mobile order is ready for pickup?",
      messageTemplate: "I placed a mobile order through the app. How will I know when it's ready to be picked up?"
    },
    {
      category: "The McDonald's app",
      section: "Mobile Ordering via My McDonald's App",
      question: "Can I save my payment card for future use in the app?",
      messageTemplate: "I'd like to save my credit card details in the McDonald's app for faster checkout. Is this possible and is it secure?"
    },
    {
      category: "The McDonald's app",
      section: "Account Related",
      question: "What should I do if I forget my password?",
      messageTemplate: "I can't remember my McDonald's app password and can't log in. How can I reset it?"
    },
    {
      category: "The McDonald's app",
      section: "MyMcDonald's Rewards",
      question: "How do I earn rewards points?",
      messageTemplate: "I just started using the McDonald's app. How exactly do I earn rewards points and what can I redeem them for?"
    },
    
    // Celebrations & Parties Questions
    {
      category: "Celebrating Birthdays",
      section: "Parties at McDonald's",
      question: "How do I organize a birthday party at McDonald's?",
      messageTemplate: "My son's birthday is coming up next month, and he loves McDonald's. What do I need to do to organize a party at one of your restaurants?"
    },
    {
      category: "Celebrating Birthdays",
      section: "Parties at McDonald's",
      question: "How is the birthday party conducted?",
      messageTemplate: "I'm considering booking a birthday party at McDonald's. What's the typical schedule and what activities are included?"
    },
    {
      category: "Celebrating Birthdays",
      section: "Parties at Home",
      question: "Why does my Party Birthday Cake have a different design?",
      messageTemplate: "I ordered a McDonald's birthday party package for home delivery, but the cake design is different from what I saw on the website. Is this normal?"
    },
    {
      category: "Celebrating Birthdays",
      section: "Parties at Home",
      question: "How can I get Party Gift Boxes?",
      messageTemplate: "Can I purchase McDonald's party gift boxes separately without ordering a full party package?"
    },
    
    // Delivery Service Questions
    {
      category: "McDelivery® Service",
      section: "General",
      question: "Why can't I order McDelivery using a Guest account anymore?",
      messageTemplate: "I used to be able to order McDelivery without creating an account, but now it seems I need to register. Why was this changed?"
    },
    {
      category: "GrabFood/foodpanda/deliveroo Orders",
      section: "Delivery Service",
      question: "Why can't I add delivery notes for condiments on third-party platforms?",
      messageTemplate: "When I order McDonald's through GrabFood, I can't leave notes to request extra ketchup or other condiments. Why isn't this option available?"
    },
    
    // Promotions Questions
    {
      category: "Promotions",
      section: "LifeSG Credits",
      question: "How do I redeem McDonald's products using LifeSG credits?",
      messageTemplate: "I have some LifeSG credits and heard I can use them at McDonald's. How exactly do I redeem them for food?"
    },
    {
      category: "Promotions",
      section: "LifeSG Credits",
      question: "Can I use LifeSG credits for delivery orders?",
      messageTemplate: "I want to use my LifeSG credits for a McDonald's delivery order. Is this possible or can they only be used for in-store purchases?"
    },
    
    // Drive-Thru Questions
    {
      category: "Drive-Thru",
      section: "General",
      question: "What benefits do I get from the Drive-Thru decal?",
      messageTemplate: "I noticed there's a Drive-Thru decal available for my car windscreen. What benefits or perks do I get if I put it on my vehicle?"
    },
    
    // Happy Meal Questions
    {
      category: "Happy Meal®",
      section: "General",
      question: "When will the new Happy Meal toys be available?",
      messageTemplate: "My kids are excited about the Crocs Happy Meal toys. When will they be available in Singapore restaurants?"
    }
  ];
  
  return questions;
}

// Function to generate realistic customer messages based on the question templates
interface Question {
  category: string;
  section: string;
  question: string;
  messageTemplate: string;
}

export function generateCustomerMessage(questionObject: Question) {
  return {
    id: Math.random().toString(36).substring(2, 15),
    message: questionObject.messageTemplate,
    category: questionObject.category,
    section: questionObject.section,
    heading: questionObject.question,
    creationDate: new Date(),
    outcome: "Open"
  };
}

// Function to generate multiple customer messages
export function generateMultipleCustomerMessages(count = 10) {
  return generateMcDonaldsFAQQuestions()
    .then(questions => {
      // Randomly select questions if there are more than the requested count
      let selectedQuestions = questions;
      if (questions.length > count) {
        selectedQuestions = [];
        const indices = new Set<number>();
        while (indices.size < count) {
          indices.add(Math.floor(Math.random() * questions.length));
        }
        selectedQuestions = Array.from(indices).map(index => questions[index]);
      }
      
      // Generate messages for each selected question
      return selectedQuestions.map(question => generateCustomerMessage(question));
    });
}