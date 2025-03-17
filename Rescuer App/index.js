/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee, { EventType } from '@notifee/react-native';

// When a Notification is Triggered via Alarm
notifee.onBackgroundEvent(async (data) => {
  console.log(data);
});

AppRegistry.registerComponent(appName, () => App);
