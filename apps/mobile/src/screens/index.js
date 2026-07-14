export { default as HomeScreen } from './HomeScreen';
export { default as LoginScreen } from './LoginScreen';
export { default as DriverScreen } from './DriverScreen';
export { default as AdminScreen } from './AdminScreen';
export { default as BookRideScreen } from './BookRideScreen';

// Exportation de placeholders si les fichiers n'existent pas encore pour éviter les erreurs d'import dans App.js
export const RegisterScreen = () => null;
export const ProfileScreen = () => null;
export const RideHistoryScreen = () => null;
export const SettingsScreen = () => null;
export const ActiveRideScreen = () => null;
export const NotificationsScreen = () => null;
