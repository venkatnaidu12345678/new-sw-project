/**
 * @format
 */
import "react-native-gesture-handler";
import "./src/Notifications/backgroundHandler";
import "./src/Notifications/notifeeBackground";
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { initCrashlytics } from "./src/services/crashlytics";

initCrashlytics();

AppRegistry.registerComponent(appName, () => App);
