import { generateUUID } from '@/lib/utils'; 

// Helper function to get a random item from an array
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Message generator function for McDonald's FAQ-related queries
function generateMcDonaldsMessage(category: string, section: string): { message: string, reply: string | null } {
  // Templates for customer messages based on FAQ categories
  const messageTemplates: { [key: string]: { [key: string]: string[] } } = {
    "Food Quality": {
      "Ingredients": [
        "What ingredients do you use in your {item}? I'm concerned about allergens.",
        "Are your {item} made with real meat or is it processed?",
        "Do you use any artificial preservatives in your {item}?",
        "I'd like to know the source of ingredients for your {item}."
      ],
      "Preparation": [
        "How are your {item} prepared? Are they fresh or frozen?",
        "Do you cook {item} in the same oil as other products?",
        "Is the {item} made fresh daily or prepared in advance?",
        "What's your cooking process for the {item}?"
      ]
    },
    "Nutrition": {
      "Dietary Info": [
        "I'm on a low-carb diet. What options do you have besides the {item}?",
        "How many calories are in a {item}?",
        "Is the {item} suitable for someone with a gluten intolerance?",
        "What's the sodium content in your {item}?"
      ],
      "Allergens": [
        "Does your {item} contain nuts? I have a severe allergy.",
        "Is your {item} dairy-free?",
        "Can you tell me all allergens present in the {item}?",
        "I have a shellfish allergy. Is it safe for me to eat the {item}?"
      ]
    },
    "Menu Options": {
      "Availability": [
        "Is the {item} available all day or only during breakfast hours?",
        "When will you bring back the {item} to the menu?",
        "Do all locations serve the {item} or is it only at select restaurants?",
        "I can't find the {item} on your app. Is it still available?"
      ],
      "Customization": [
        "Can I customize my {item} to remove onions?",
        "Is it possible to order the {item} without sauce?",
        "Can I substitute the bun on my {item} for a lettuce wrap?",
        "Do you charge extra if I add bacon to my {item}?"
      ]
    },
    "Restaurant Experience": {
      "Service": [
        "The service was slow when I ordered a {item} at your Main Street location.",
        "Your staff was very helpful when I had questions about the {item}.",
        "I'm disappointed with how my {item} was served today.",
        "The employee was rude when I asked for a fresh {item}."
      ],
      "Cleanliness": [
        "The dining area wasn't clean when I came in for a {item} today.",
        "I found a hair in my {item} at your downtown location.",
        "Your restaurant was spotless when I came in for a {item} yesterday.",
        "The table was sticky when I sat down to eat my {item}."
      ]
    },
    "Value & Pricing": {
      "Deals": [
        "Are there any current promotions for the {item}?",
        "Is the {item} included in your value meal options?",
        "When will the BOGO deal for {item} return?",
        "Can I use a coupon for the {item} even if it's already discounted?"
      ],
      "Price Concerns": [
        "Why did the price of the {item} increase recently?",
        "The {item} is cheaper at other locations. Why is it more expensive here?",
        "Is the {item} always this expensive or is it a temporary price?",
        "I feel the {item} isn't worth the current price point."
      ]
    }
  };

  // Common McDonald's menu items to insert into templates
  const menuItems = [
    "Big Mac", "Quarter Pounder", "McChicken", "Filet-O-Fish", "McNuggets", 
    "McFlurry", "French Fries", "Apple Pie", "Happy Meal", "Egg McMuffin",
    "McDouble", "Chicken McNuggets", "McRib", "Sausage McMuffin", "Hash Browns"
  ];

  // Generic reply templates that can work for most inquiries
  const replyTemplates = [
    "Thank you for your inquiry about our {item}. {categoryResponse}",
    "We appreciate your question regarding the {item}. {categoryResponse}",
    "Thanks for reaching out about our {item}. {categoryResponse}",
    "We value your feedback about the {item}. {categoryResponse}"
  ];

  // Category-specific response snippets
  const categoryResponses: { [key: string]: string[] } = {
    "Food Quality": [
      "At McDonald's, we take pride in the quality of our ingredients and we'd be happy to provide detailed information on our sourcing and preparation methods.",
      "We maintain strict quality standards for all our menu items and can assure you that we use quality ingredients in our products.",
      "Food safety and quality are our top priorities, and we follow rigorous procedures to ensure every meal meets our standards."
    ],
    "Nutrition": [
      "We offer a variety of menu options to accommodate different dietary needs and preferences. Complete nutritional information is available on our website and mobile app.",
      "We understand the importance of making informed food choices, which is why we provide detailed nutritional information for all our products.",
      "We're committed to transparency about our food, including ingredients and nutritional content to help you make the best choices for your dietary needs."
    ],
    "Menu Options": [
      "Our menu varies by location and time of day, but we strive to offer a range of options to satisfy our customers' preferences.",
      "We regularly update our menu based on customer feedback and seasonal availability of ingredients.",
      "We offer customization options for many of our menu items to ensure you get exactly what you're looking for."
    ],
    "Restaurant Experience": [
      "We're committed to providing a positive dining experience and appreciate you taking the time to share your feedback, which helps us improve.",
      "Customer satisfaction is important to us, and we continually train our staff to provide excellent service in a clean environment.",
      "We hold our restaurants to high standards of cleanliness and service, and your experience matters to us."
    ],
    "Value & Pricing": [
      "We strive to offer good value for money while maintaining the quality our customers expect from McDonald's.",
      "Our pricing reflects our commitment to using quality ingredients while still providing affordable meal options.",
      "We regularly offer promotions and deals through our app to provide additional value to our loyal customers."
    ]
  };

  // Select random items for message generation
  const selectedItem = getRandomItem(menuItems);
  
  // Get message templates for the selected category/section
  const messagesForCategory = messageTemplates[category]?.[section] || [];
  
  // Fallback if no messages found for this category/section
  if (messagesForCategory.length === 0) {
    return { 
      message: `I have a question about McDonald's ${selectedItem}.`, 
      reply: null 
    };
  }
  
  // Select a random message and insert menu item
  const messageTemplate = getRandomItem(messagesForCategory);
  const message = messageTemplate.replace(/{item}/g, selectedItem);
  
  // Randomly decide if this record has a reply
  const hasReply = Math.random() > 0.7; 
  
  let reply = null;
  if (hasReply) {
    const replyTemplate = getRandomItem(replyTemplates);
    const categoryResponse = getRandomItem(categoryResponses[category] || categoryResponses["Menu Options"]);
    reply = replyTemplate
      .replace(/{item}/g, selectedItem)
      .replace(/{categoryResponse}/g, categoryResponse);
  }

  return { message, reply };
}

// Random record generator function for McDonald's FAQ-related queries
export function randomMcDonaldsRecordGenerator(id: string, x: number) {
  // Categories and sections based on McDonald's FAQ structure
  const categories = [
    "Food Quality", 
    "Nutrition", 
    "Menu Options", 
    "Restaurant Experience", 
    "Value & Pricing"
  ];
  
  const sectionsByCategory: { [key: string]: string[] } = {
    "Food Quality": ["Ingredients", "Preparation", "Sourcing", "Standards"],
    "Nutrition": ["Dietary Info", "Allergens", "Calorie Content", "Dietary Restrictions"],
    "Menu Options": ["Availability", "Customization", "New Items", "Limited Time Offers"],
    "Restaurant Experience": ["Service", "Cleanliness", "Atmosphere", "Drive-Thru"],
    "Value & Pricing": ["Deals", "Price Concerns", "App Rewards", "Promotions"]
  };

  // Other parameters for record generation
  const caseTypes = ["Inquiry", "Complaint", "Feedback", "Question"];
  const channels = ["Email", "Web Form", "Mobile App", "Social Media", "Call Center"];
  const sectionCodes = ["CX", "QA", "NU", "MK", "OP", "PR"];
  const locations = ["North Region", "South Region", "East Region", "West Region", "Central Region", "Online"];

  const records = [];

  for (let i = 0; i < x; i++) {
    // Randomized values for each record
    const creationDate = new Date();
    creationDate.setDate(creationDate.getDate() - Math.floor(Math.random() * 30)); // Random date within last 30 days

    const category = getRandomItem(categories);
    const sections = sectionsByCategory[category] || ["General"];
    const section = getRandomItem(sections);
    
    const hasReply = Math.random() > 0.3; // 70% chance of having a reply
    const replyDate = hasReply ? 
      new Date(creationDate.getTime() + (Math.floor(Math.random() * 48) + 1) * 60 * 60 * 1000) : // 1-48 hours after creation
      null;

    const outcome = hasReply ? "Replied" : Math.random() > 0.5 ? "Open" : "Pending";
    
    // Generate the message based on the category and section
    const { message, reply } = generateMcDonaldsMessage(category, section);

    const record = {
      id: generateUUID(),
      message,
      sectionCode: getRandomItem(sectionCodes),
      actionOfficer1: id,
      actionOfficer2: Math.random() > 0.7 ? generateUUID().substring(0, 8) : null, // 30% chance of having a second officer
      creationOfficer: id,
      caseType: getRandomItem(caseTypes),
      channel: getRandomItem(channels),
      category,
      subcategory: section, // Using section as subcategory
      outcome,
      replyDate,
      reply,
      planningArea: getRandomItem(locations),
      location: getRandomItem(locations),
      locationX: null,
      locationY: null,
      creationDate,
      receiveDate: new Date(creationDate.getTime() - Math.floor(Math.random() * 12) * 60 * 60 * 1000), // 0-12 hours before creation
      draft: null,
      summary: null,
      evergreen_topics: [category, section],
      reasoning: null,
      relevantChunks: [],
      relatedEmails: [],
    };

    records.push(record);
  }

  return records;
}