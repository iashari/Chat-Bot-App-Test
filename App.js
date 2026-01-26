import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

const AppContent = () => {
  const { isDarkMode } = useTheme();
  return (
    <>
      <AppNavigator />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
