export const conversations = [
  {
    id: '1',
    name: 'GPT-4 Tutor',
    avatar: 'https://ui-avatars.com/api/?name=GPT+4&background=6366f1&color=fff',
    lastMessage: 'Sure! Let me explain how React hooks work...',
    timestamp: '10:45 AM',
    messages: [
      { id: '1', text: 'Hi! Can you help me understand React hooks?', isUser: true, time: '10:40 AM' },
      { id: '2', text: 'Of course! React hooks are functions that let you use state and other React features in functional components. The most common ones are useState and useEffect.', isUser: false, time: '10:41 AM' },
      { id: '3', text: 'What is useState used for?', isUser: true, time: '10:43 AM' },
      { id: '4', text: 'Sure! Let me explain how React hooks work...', isUser: false, time: '10:45 AM' },
    ],
  },
  {
    id: '2',
    name: 'Code Assistant',
    avatar: 'https://ui-avatars.com/api/?name=Code+AI&background=10b981&color=fff',
    lastMessage: 'The bug is in line 42. You need to add a null check.',
    timestamp: '9:30 AM',
    messages: [
      { id: '1', text: 'I have a bug in my code, can you help?', isUser: true, time: '9:25 AM' },
      { id: '2', text: 'Sure! Please share the code and describe the issue.', isUser: false, time: '9:26 AM' },
      { id: '3', text: 'My app crashes when I try to access user.name', isUser: true, time: '9:28 AM' },
      { id: '4', text: 'The bug is in line 42. You need to add a null check.', isUser: false, time: '9:30 AM' },
    ],
  },
  {
    id: '3',
    name: 'Writing Helper',
    avatar: 'https://ui-avatars.com/api/?name=Write+AI&background=f59e0b&color=fff',
    lastMessage: 'Here is a revised version of your paragraph...',
    timestamp: 'Yesterday',
    messages: [
      { id: '1', text: 'Can you help me improve this paragraph?', isUser: true, time: '3:00 PM' },
      { id: '2', text: 'Of course! Please share the paragraph you would like me to review.', isUser: false, time: '3:01 PM' },
      { id: '3', text: 'The quick brown fox jumps over the lazy dog. It was a sunny day.', isUser: true, time: '3:05 PM' },
      { id: '4', text: 'Here is a revised version of your paragraph...', isUser: false, time: '3:10 PM' },
    ],
  },
  {
    id: '4',
    name: 'Math Solver',
    avatar: 'https://ui-avatars.com/api/?name=Math+AI&background=ef4444&color=fff',
    lastMessage: 'The answer is x = 7. Here is the step-by-step solution...',
    timestamp: 'Yesterday',
    messages: [
      { id: '1', text: 'Can you solve 2x + 3 = 17?', isUser: true, time: '11:00 AM' },
      { id: '2', text: 'The answer is x = 7. Here is the step-by-step solution...', isUser: false, time: '11:01 AM' },
    ],
  },
  {
    id: '5',
    name: 'Language Tutor',
    avatar: 'https://ui-avatars.com/api/?name=Lang+AI&background=8b5cf6&color=fff',
    lastMessage: 'Great job! Your pronunciation is improving.',
    timestamp: 'Mon',
    messages: [
      { id: '1', text: 'How do I say "hello" in Japanese?', isUser: true, time: '2:00 PM' },
      { id: '2', text: 'In Japanese, "hello" is "Konnichiwa" (こんにちは). It is used during the day.', isUser: false, time: '2:01 PM' },
      { id: '3', text: 'Konnichiwa!', isUser: true, time: '2:05 PM' },
      { id: '4', text: 'Great job! Your pronunciation is improving.', isUser: false, time: '2:06 PM' },
    ],
  },
];

export const userProfile = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=3b82f6&color=fff&size=128',
};
