# AI Chat Mobile App

A functional mobile UI for an AI Chat application built with React Native and Expo.

## Features

- **Conversation List (Home Screen)**: View all your AI chat conversations with avatars, previews, and timestamps
- **Chat Detail Screen**: Interactive messaging interface with chat bubbles and input area
- **Profile Screen**: User settings with menu items and account overview
- **Dark Mode**: Toggle between light and dark themes
- **Typing Indicator**: Animated "..." indicator when AI is responding
- **Send Animation**: Chat bubbles animate when appearing
- **Pull to Refresh**: Refresh conversation list with pull gesture

## Tech Stack

- **Framework**: React Native (Expo)
- **Navigation**: React Navigation (Stack & Bottom Tabs)
- **Icons**: Lucide React Native
- **State Management**: React Hooks (useState, useEffect, useContext)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-chat-app
```

2. Install dependencies:
```bash
npm install
```

## Running the App

Start the development server:
```bash
npx expo start
```

Then:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator
- Scan the QR code with Expo Go app on your physical device

## Project Structure

```
ai-chat-app/
├── App.js
├── src/
│   ├── components/
│   │   ├── ChatBubble.js
│   │   ├── ConversationItem.js
│   │   ├── MenuItem.js
│   │   └── TypingIndicator.js
│   ├── screens/
│   │   ├── ConversationListScreen.js
│   │   ├── ChatDetailScreen.js
│   │   └── ProfileScreen.js
│   ├── navigation/
│   │   └── AppNavigator.js
│   ├── context/
│   │   └── ThemeContext.js
│   └── data/
│       └── mockData.js
├── package.json
└── README.md
```

## Screenshots

*Add screenshots of your app here*

## License

MIT
