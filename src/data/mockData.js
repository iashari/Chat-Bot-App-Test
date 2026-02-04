// Mock Data - Only for user profile and example prompts
// Chats and Assistants are now stored in backend database

export const examplePrompts = [
  {
    id: '1',
    title: 'Fun Facts and Trivia',
    description: 'Explore a world of fascinating facts and trivia to expand your knowledge',
    icon: 'Sparkles',
  },
  {
    id: '2',
    title: 'Local Cuisine',
    description: 'Embark on a culinary journey through the flavors of local cuisine',
    icon: 'UtensilsCrossed',
  },
  {
    id: '3',
    title: 'CV Formatting',
    description: 'Craft a standout CV with tips on formatting and presentation',
    icon: 'FileText',
  },
  {
    id: '4',
    title: 'Gift Suggestions',
    description: 'Discover personalized gift ideas for any occasion',
    icon: 'Gift',
  },
];

export const userProfile = {
  name: 'User',
  email: 'user@example.com',
  avatar: 'https://ui-avatars.com/api/?name=User&background=6B4EFF&color=fff&size=128&bold=true',
  plan: 'Free',
  joinDate: 'Jan 2024',
  totalChats: 0,
  totalMessages: 0,
};

// Empty conversations - will be loaded from backend
export const conversations = [];
