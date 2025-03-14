import { JSONContent } from "novel";

interface EmailData {
  sender: string;
  subject: string;
  content: string;
  draft?: string; // Make draft optional since it might not be available immediately
  reply?: string; // Add reply field as optional
}

export const generateEditorContent = (emailData: EmailData): JSONContent => {
  // Default draft message if none is provided
  const draftContent = emailData.draft || "Draft in progress...";
  
  // Split the draft content into separate paragraphs based on newlines
  const paragraphs = draftContent.split("\n\n").map(paragraph => ({
    type: "paragraph",
    content: [{ type: "text", text: paragraph }]
  }));
  
  return {
    type: "doc",
    content: [
      ...paragraphs, // Add the paragraphs dynamically here
    ]
  };
};
