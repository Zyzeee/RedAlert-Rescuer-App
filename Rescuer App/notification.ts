import notifee, { AndroidCategory, AndroidImportance, TimestampTrigger, TriggerType } from '@notifee/react-native';

export async function displayNotification({ 
    title = 'Red Alert', 
    body = 'Main body of the Red Alert Notification' 
  }: { title?: string, body?: string }) {
  await notifee.requestPermission();

  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    vibration: true,
    vibrationPattern: [300, 500],
    sound: 'default'
  });

  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId,
      pressAction: {
        id: "default",
      }
    }
  });
}

export async function alarmNotification({ 
    channelId,
    title = 'Red Alert', 
    body = 'Main body of the Red Alert Alarm Notification',
    time
  }: { channelId: any, title?: string, body?: string, time: any }) {
  await notifee.requestPermission();

  let date = new Date(time);
  if (date < new Date()) {
    date = new Date(Date.now() + 1000);
  }

  // Create a time-based trigger
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: date.getTime(),
  };

  // Create a trigger notification
  const triggerId = await notifee.createTriggerNotification(
    {
      title,
      body,
      android: {
        channelId,
        pressAction: {
            id: "default",
          },
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          fullScreenAction: {
            id: 'default'
          }
      },
    },
    trigger,
  );

  // When a Notification is Triggered via Alarm
  notifee.onForegroundEvent(async ({ type, detail }: any) => {
    if (detail.notification.id === triggerId) {
      //const dataRef = ref(DB, '/Owner');
      //update(dataRef, { arrived: true });
    }
  });
}

export async function cancelNotification(notificationId: any) {
  await notifee.cancelNotification(notificationId);
}
