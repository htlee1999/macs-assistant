import { generateUUID } from '@/lib/utils'; // Assuming you have a utility function for UUID generation

// Helper function to get a random item from an array
function getRandomItem(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper function to get a random item from an array of objects
function getRandomMessage<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  
  // Message generator function
  function generateMessage(caseType: string, category: string, planningArea: string, hasReply: boolean): { message: string, reply: string | null } {
      const messageTemplates: { [key: string]: { [key: string]: { message: string, reply: string }[] } } = {
        Complaint: {
            Planning: [
              {
                message: "I am deeply concerned about the recent urban redevelopment project in {location}. The project is overshadowing the needs of residents and seems to prioritize corporate interests over community well-being.",
                reply: "Thank you for your feedback. We are currently assessing the impact of the project, and your concerns regarding the community's needs will be considered in our review process."
              },
              {
                message: "I am unhappy with the way the new housing plans in {location} are being handled. The designs don't seem to take into account the need for sufficient green spaces, which is crucial for the well-being of families here.",
                reply: "Thank you for raising this concern. We value your input and will ensure that the development is aligned with the community's need for green spaces and public amenities."
              }
            ],
            Mobility: [
              {
                message: "Lately, our transport system has become increasingly overcrowded, especially during peak hours. I would like to see more frequent services and better crowd management to improve the daily commuting experience.",
                reply: "Thank you for your input. We are continuously improving our public transport system, and we will look into increasing service frequency during peak hours to better manage demand."
              },
              {
                message: "Buses in {location} are often delayed! So inconvenient. It's difficult for me to rely on the crappy public transport system. Can’t even get to work on time.",
                reply: "We apologize for the inconvenience. We are actively reviewing the schedules and will work to improve bus service reliability in {location}."
              }
            ],
            Nature: [
              {
                message: "I am concerned about the impact of the recent reclamation projects in Singapore. The destruction of natural shorelines in areas like {location} is affecting the local marine biodiversity.",
                reply: "Thank you for your concern. We understand the importance of protecting marine life and will ensure that all projects are evaluated for their environmental impact."
              },
              {
                message: "The clearing of forests for new developments in {location} is disturbing the local wildlife. I strongly urge the government to consider alternatives to safeguard these habitats.",
                reply: "We appreciate your feedback. Rest assured that environmental and wildlife concerns are an important consideration in our planning process, and we will strive to minimize impact on natural habitats."
              }
            ],
            Heritage: [
              {
                message: "I am concerned about the proposed changes to the historical {location}. Some of the newer developments are overshadowing the cultural significance of the place.",
                reply: "Thank you for your feedback on {location}. We recognize the cultural importance of this area and will ensure that developments respect its heritage and history."
              },
              {
                message: "With the increasing number of high-rise buildings in {location}, I fear that the historic low-rise buildings that give the area its charm will be lost.",
                reply: "We value your feedback about {location}'s heritage. We are committed to preserving the character of this area while balancing urban development needs."
              }
            ]
          },
          Feedback: {
            Planning: [
              {
                message: "I believe the recent planning in {location} has made it less pedestrian-friendly, especially with the increased vehicle traffic. It would be great if more emphasis could be placed on creating walkable spaces.",
                reply: "Thank you for your suggestion. We agree that walkability is essential in busy areas like {location}, and we are exploring ways to improve pedestrian infrastructure."
              },
              {
                message: "I like the plans for the new town in {location}, but I feel the green spaces could be larger to promote healthier lifestyles for residents. This could be a great model for future developments in Singapore.",
                reply: "Thank you for your feedback. We will review the green space allocations in {location} to ensure that residents enjoy a well-balanced environment."
              }
            ],
            Mobility: [
              {
                message: "I think Singapore’s MRT stations should have more accessible features for the elderly and disabled, especially at interchange stations like {location}, where transferring between lines can be challenging.",
                reply: "Thank you for your valuable input. We are continually working to improve accessibility across our public transport network, including at interchange stations."
              },
              {
                message: "The expansion of cycling lanes around {location} is a great initiative. I hope it can be replicated in other areas like {location} to make cycling safer for everyone.",
                reply: "Thank you for your positive feedback. We are actively working on expanding cycling infrastructure in various areas, and your suggestion will be taken into consideration."
              }
            ],
            Nature: [
              {
                message: "I think Singapore is doing a great job of integrating nature into urban spaces. However, more initiatives like vertical gardens and rooftop greenery should be encouraged across all new developments.",
                reply: "Thank you for your support. We are committed to making Singapore a green city and will continue to promote initiatives like vertical gardens and green rooftops in new developments."
              },
              {
                message: "I appreciate the efforts to preserve natural parks like {location}, but I think more education campaigns should be conducted to raise awareness about the importance of protecting biodiversity.",
                reply: "Thank you for your suggestion. We are committed to conservation and will explore more educational campaigns to engage the public on the importance of biodiversity."
              }
            ],
            Heritage: [
              {
                message: "I appreciate the preservation of heritage sites like {location}. However, I think more can be done to raise awareness about these sites, especially among the younger generation.",
                reply: "Thank you for your valuable suggestion. We are exploring more ways to engage the younger generation with our heritage sites and ensure their historical significance is well-understood."
              },
              {
                message: "The efforts to preserve the {location} area are commendable. However, I feel that more local cultural events should be held to further celebrate the heritage of the area.",
                reply: "Thank you for your feedback. We will look into hosting more cultural events along the {location} to celebrate its rich history."
              }
            ]
          },
          Issue: {
            Planning: [
              {
                message: "The construction work near {location} is causing significant disruptions to daily life. The noise and traffic are making it difficult for residents to go about their routines.",
                reply: "We apologize for the disruptions caused. We are working with the contractors to minimize the impact on the community and ensure that the work progresses efficiently."
              },
              {
                message: "The lack of sufficient public amenities in new residential areas like {location} is an ongoing issue. More attention should be given to providing recreational facilities for residents.",
                reply: "Thank you for raising this issue. We will review the provision of amenities in {location} to ensure that the needs of residents are adequately met."
              }
            ],
            Mobility: [
              {
                message: "The MRT service on the East-West Line is frequently delayed, especially during peak hours. This has become a daily inconvenience for many commuters, including myself.",
                reply: "We sincerely apologize for the delays you’ve experienced. We are addressing the issues causing the disruptions and working to improve the reliability of the East-West Line."
              },
              {
                message: "The lack of clear signs for bus routes in certain areas, such as {location}, is confusing. It’s challenging for commuters to know which buses to take without proper guidance.",
                reply: "Thank you for bringing this to our attention. We are working on improving signage and providing clearer information for bus routes in {location}."
              }
            ],
            Nature: [
              {
                message: "The recent construction near Singapore’s coastline is affecting the marine ecosystem. I’ve noticed a decline in the number of fish and other sea creatures in the area.",
                reply: "We take your concerns seriously. We are investigating the potential impacts of nearby construction on marine life and will ensure that any necessary mitigation measures are implemented."
              },
              {
                message: "I’ve noticed that the air quality in Singapore has been deteriorating in recent months. More action is needed to address the sources of pollution, particularly from vehicle emissions.",
                reply: "Thank you for your feedback. We are actively addressing air quality issues and are implementing stricter measures to reduce vehicle emissions."
              }
            ],
            Heritage: [
              {
                message: "The destruction of the historical building at the corner of {location} is a huge loss. It is part of our heritage, and it’s sad to see it demolished for new developments.",
                reply: "We understand your concerns. We are reviewing our heritage preservation policies to ensure that important historical sites are protected in future developments."
              },
              {
                message: "There seems to be a lack of maintenance for some of Singapore's older landmarks, such as the old colonial buildings. This neglect is slowly eroding their value and significance.",
                reply: "Thank you for highlighting this issue. We are working on plans to ensure the preservation and proper maintenance of Singapore’s older historical landmarks."
              }
            ]
          },
          Comment: {
            Planning: [
              {
                message: "The ongoing development in {location} is very impressive. It’s nice to see how well Singapore is blending modern architecture with nature.",
                reply: "Thank you for your positive comment. We are committed to creating sustainable and aesthetically pleasing developments that integrate well with the natural environment."
              },
              {
                message: "The latest plans for the new mixed-use development in {location} look exciting. I hope that more projects like this can be done across Singapore.",
                reply: "Thank you for your enthusiasm. We are exploring similar mixed-use developments across the island to improve urban living experiences."
              }
            ],
            Mobility: [
              {
                message: "The new MRT line extension to {location} is going to be a game-changer. It will greatly reduce commuting time for residents in the area.",
                reply: "Thank you for your feedback. We are excited about the new MRT extension and its positive impact on the daily commute for many residents."
              },
              {
                message: "The introduction of more electric buses in Singapore is a great step towards a greener future. I hope more public transport can transition to cleaner energy.",
                reply: "Thank you for your support. We are committed to promoting eco-friendly transportation options, and the expansion of electric buses is part of this effort."
              }
            ],
            Nature: [
              {
                message: "Singapore’s efforts to plant more trees and integrate nature into urban spaces are impressive. It’s a great example of how a city can thrive while preserving the environment.",
                reply: "Thank you for your kind words. We are dedicated to making Singapore a greener and more sustainable city, and your feedback encourages us to keep up the good work."
              },
              {
                message: "The recent initiatives to protect Singapore’s coastline and marine life are commendable. I hope that these efforts continue to grow and inspire other cities.",
                reply: "Thank you for your positive feedback. We are committed to protecting our natural resources, and we will continue working on conservation efforts for the future."
              }
            ],
            Heritage: [
              {
                message: "I love how Singapore celebrates its rich heritage through its festivals and events. It’s great to see the younger generation engaging with the culture.",
                reply: "Thank you for your support. We believe that celebrating our heritage is crucial, and we will continue to encourage participation in cultural activities."
              },
              {
                message: "It’s encouraging to see the restoration of heritage buildings like the old {location}. It really helps to preserve the character of the city.",
                reply: "Thank you for your appreciation. We are dedicated to preserving the historical charm of Singapore while balancing modern development."
              }
            ]
        },
      };
  
      // Retrieve the relevant message-reply pairs for the selected caseType and category
      const messages = messageTemplates[caseType]?.[category] || [];
  
      if (messages.length === 0) {
        // Handle case where no messages are found for the category
        return { message: "No message available", reply: null };
      }
  
      // Select a random message-reply pair
      const selectedPair = getRandomMessage(messages);
      const message = selectedPair.message.replace("{location}", planningArea);
      const reply = hasReply ? selectedPair.reply.replace("{location}", planningArea) : null;
  
      return { message, reply };
  }  

// Random record generator function
export function randomRecordGenerator(id: string, x: number) {
  // Available values for randomization
  const caseTypes = ["Complaint", "Feedback", "Issue", "Comment"];
  const channels = ["Email", "Message", "Website"];
  const categories = ["Planning", "Mobility", "Nature", "Heritage"];
  const sectionCodes = ["A", "B", "C", "D", "E", "F"];
  const planningAreas = ["Ang Mo Kio", "Bedok", "Bishan", "Boon Lay", "Bukit Batok", "Bukit Merah", "Bukit Panjang", "Bukit Timah", "Changi", "Choa Chu Kang", "Clementi", "Downtown Core", "Geylang", "Hougang", "Jurong East", "Jurong West", "Kallang", "Marina South", "Marine Parade", "Newton", "Novena", "Orchard", "Outram", "Pasir Ris", "Paya Lebar", "Pioneer", "Punggol", "Queenstown", "River Valley", "Rochor", "Sembawang", "Sengkang", "Serangoon", "Singapore River", "Tampines", "Tanglin", "Tengah", "Toa Payoh", "Woodlands", "Yishun"];

  const records = [];

  for (let i = 0; i < x; i++) {
    // Randomized values for each record
    const creationDate = new Date();
    creationDate.setDate(creationDate.getDate()); // Random creation date within the last 30 days

    const hasReply = Math.random() > 0.8; 
    const replyDate = hasReply ? new Date(creationDate.getTime() + 24 * 60 * 60 * 1000) : null; // Reply one day after creation if exists

    const outcome = hasReply ? "Replied" : "Open"; // Set outcome based on reply
    const planningArea = getRandomItem(planningAreas);
    const caseType = getRandomItem(caseTypes);
    const category = getRandomItem(categories);

    // Generate the message based on the caseType and category
    const { message, reply } = generateMessage(caseType, category, planningArea, hasReply);

    const record = {
      id: generateUUID(),
      message, 
      sectionCode: getRandomItem(sectionCodes), 
      actionOfficer1: id, 
      actionOfficer2: null,
      creationOfficer: id, 
      caseType, 
      channel: getRandomItem(channels), 
      category, 
      subcategory: null, 
      outcome, 
      replyDate,
      reply: reply,
      planningArea, 
      location: planningArea, 
      locationX: null, 
      locationY: null, 
      creationDate, 
      receiveDate: creationDate, 
      draft: null, 
      summary: null, 
      evergreen_topics: [],
      reasoning: null, 
      relevantChunks: [], 
      relatedEmails: [], 
    };

    records.push(record);
  }

  return records;
}
