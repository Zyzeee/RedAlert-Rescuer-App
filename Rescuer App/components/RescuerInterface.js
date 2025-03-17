import React, { useState, useEffect, useRef, useContext } from 'react';
import { ScrollView, BackHandler, View, StyleSheet, TouchableOpacity, Text, Animated, Dimensions, Alert, Linking, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useNavigation } from '@react-navigation/native';
import { DB } from '../firebase';
import { ref, get, update, onValue, onChildChanged } from 'firebase/database';
import { alarmNotification, displayNotification } from '../notification';
import notifee from '@notifee/react-native';
import { BarChart } from 'react-native-chart-kit';
import AppContext from '../AppContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function App() {
  const navigation = useNavigation();
  const { rescuerUserId } = useContext(AppContext);
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [isMarkerPressed, setIsMarkerPressed] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showNavigationBox, setShowNavigationBox] = useState(false);
  const [dataBoxWidth, setDataBoxWidth] = useState(screenWidth);
  const [dataBoxHeight, setDataBoxHeight] = useState(screenHeight);
  const [dataBoxTop, setDataBoxTop] = useState(0);
  const [fadeAnimation] = useState(new Animated.Value(1));
  const [markerInteractive, setMarkerInteractive] = useState(true);
  const [markerCoordinate, setMarkerCoordinate] = useState(null);
  const [responded, setResponded] = useState(false);
  const [owners, setOwners] = useState([]);
  const [allowed, setAllowed] = useState(false);
  const [ownerId, setOwnerId] = useState('');
  const [markers, setMarkers] = useState([]);
  const [menuPressed, setMenuPressed] = useState(false);
  const [menuAnimation] = useState(new Animated.Value(0));
  const [arrived, setArrived] = useState(false);
  const lastUpdateTimes = useRef({});
	const [houseOnFire, setHouseOnFire] = useState(false);
  const [houseResponded, sethouseResponded] = useState(false);
	const [assistance, setAssistance] = useState(false);
  const [time, setTime] = useState([]);
  const [temp, setTemp] = useState([]);
  const [smoke, setSmoke] = useState([]);
  const [fire, setFire] = useState([]);
  const [unsubscribeLogs, setUnsubscribeLogs] = useState(null);
  const [unsubscribeLogsCV, setUnsubscribeLogsCV] = useState(null);
	const [barChartData, setBarChartData] = useState({
		labels: ['10mins', '20mins', '30mins', '40mins', '50mins'],
		datasets: [
			{
				data: [],
			},
		],
	});

  let menuTimeout;

  const logsCallback = (snapshot, userId) => {
    if (!snapshot.exists()) {
      setTime([])
      setTemp([])
      setSmoke([])
      setFire([])
      return;
    }
    const filterLogs = Object.keys(snapshot.val()).filter(key => {
      const { UserID } = snapshot.val()[key.toString()]
      return UserID == userId
    });

    let time = [];
    let temp = [];
    let smoke = [];
    let fire = [];
    filterLogs.map((log, index) => {
      const l = snapshot.val()[log];
      time.push(
        ((index + 1) * 10).toString()
      )
      temp.push(
        l.Temperature?.toString()
      )
      smoke.push(
        l.Smoke >= 150 ? 'Yes' : 'No'
      )
      fire.push(
        l.Fire ? 'Yes' : 'No'
      )
    })

    setTime(time);
    setTemp(temp);
    setSmoke(smoke);
    setFire(fire);
  }

  const logsCVCallback = (snapshot, userId) => {
    if (!snapshot.exists()) {
      setBarChartData({
        labels: ['10mins', '20mins', '30mins', '40mins', '50mins'],
        datasets: [
          {
            data: [],
          },
        ],
      })
      return;
    };

    const filterLogs = Object.keys(snapshot.val()).filter(key => {
      const { UserID } = snapshot.val()[key.toString()]
      return UserID == userId
    });
    let cvs = [];
    let cvsIndex = [];
    filterLogs.map((log, index) => {
      const l = snapshot.val()[log];
      cvs.push(
        l.CombinedValue
      )
      cvsIndex.push(
        (10 * (index + 1)).toString() + 'mins'
      )
    })
    setBarChartData({
      labels: cvsIndex,
      datasets: [
        {
          data: cvs,
        },
      ],
    });
  }

  useEffect(() => {
    if (ownerId) {
      console.log('ownerid: ', ownerId)
      const logsRef = ref(DB, `/Logs`);
      const fetchOnceLogs= async () => {
        setTime([]);
        setTemp([]);
        setSmoke([]);
        setFire([]);
        const onceSnapshot = await get(logsRef);
        logsCallback(onceSnapshot, owners[ownerId]['userId']);
      }
      fetchOnceLogs()

      const unsubscribeLogs = onValue(logsRef, (snapshot) => {
        logsCallback(snapshot, owners[ownerId]['userId']);
      });

      setUnsubscribeLogs(() => unsubscribeLogs);

      const logsCVRef = ref(DB, `/LogsCV`);
      const fetchOnceLogsCV = async () => {
        const onceSnapshot = await get(logsCVRef);
        logsCVCallback(onceSnapshot, owners[ownerId]['userId']);
      }
      fetchOnceLogsCV();

      const unsubscribeLogsCV = onValue(logsCVRef, (snapshot) => {
        logsCVCallback(snapshot, owners[ownerId]['userId']);
      });

      setUnsubscribeLogsCV(() => unsubscribeLogsCV);
    }
  }, [ownerId])

  useEffect(() => {
		const requestNotificationPermission = async () => {
			await notifee.requestPermission();
			console.log('Notification permissions granted!');
    };

    requestNotificationPermission();

    const dataRef = ref(DB, '/Owner');
    const fetchOnce = async () => {
      const onceSnapshot = await get(dataRef);
      if (onceSnapshot.exists()) {
        setOwners(onceSnapshot.val());
        setMarkers(Object.keys(onceSnapshot.val()).map(key => {
          const { arrived, latitude, longitude, allowed, rescuer_user_id } = onceSnapshot.val()[key];
          // const color = arrived ? 'green' : 'red';
          const color = !allowed ? 'green' : 'red';
          lastUpdateTimes.current[key] = Date.now();
          return { arrived, key, latitude, longitude, allowed, color, rescuer_user_id };
        }))
      }
    }

    fetchOnce();
    const unsubscribe = onChildChanged(dataRef, (snapshot) => {
      const key = snapshot.key;
      const updatedData = snapshot.val();
      setOwners(prevOwners => ({
        ...prevOwners,
        [key]: updatedData
      }));
      setHouseOnFire(updatedData.Fire);
      setAssistance(updatedData.assistance);
      /*
      setMarkers(Object.keys(snapshot.val()).map(key => {
        const { arrived, latitude, longitude, allowed } = snapshot.val()[key];
        const color = arrived ? 'green' : 'red';
        lastUpdateTimes.current[key] = Date.now();
        return { arrived, key, latitude, longitude, allowed, color };
      }))
      */

      lastUpdateTimes.current[key] = Date.now();
      setMarkers(prevMarkers => {
        const markerIndex = prevMarkers.findIndex(marker => marker.key === key);
        const updatedMarker = {
          ...updatedData,
          key,
          color: !updatedData.allowed ? 'green' : 'red'
        };

        if (markerIndex > -1) {
          return [
            ...prevMarkers.slice(0, markerIndex),
            updatedMarker,
            ...prevMarkers.slice(markerIndex + 1)
          ];
        } else {
          return [...prevMarkers, updatedMarker];
        }
      });
    });

    const checkForUpdates = () => {
      const now = Date.now();
      setMarkers(prevMarkers => 
        prevMarkers.map(marker => {
          const lastUpdateTime = lastUpdateTimes.current[marker.key];
          // If the marker hasn't been updated for 10 seconds, change its color to yellow
          if (now - lastUpdateTime > 10000) {
            return { ...marker, color: marker.Fire ? 'red' : !marker.allowed ? 'green' : 'yellow' };
          }
          return marker;
        })
      );
    };

    const intervalId = setInterval(checkForUpdates, 1000);

    return () => {
      unsubscribe();
      // if (unsubscribeLogs()) {
      //   unsubscribeLogs()();
      // }
      // if (unsubscribeLogsCV()) {
      //   unsubscribeLogsCV()();
      // }
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (houseOnFire || assistance) {
      const message = houseOnFire ? 'A House is Currently on Fire!' : 'We need Assistance!';
      // displayNotification({ body: message });
      const backgroundNotif = async () => {
        const channelId = await notifee.createChannel({
          id: 'Background Notification',
          name: 'Alarm Channel',
          vibration: true,
          vibrationPattern: [300, 500],
          sound: 'alarm'
        });

        alarmNotification({ channelId, time: Date.now() + 1000, title: 'Red Alert', body: message  });
      }

      backgroundNotif();
    }
  }, [houseOnFire, assistance])

  useEffect(() => {
    if (showNavigationBox) {
      const timeout = setTimeout(() => {
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => setShowNavigationBox(false));
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [showNavigationBox, fadeAnimation]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (navigation.isFocused()) {
          return true;
        }
      }
    );

    return () => backHandler.remove();
  }, [navigation]);

  const toggleDataBox = () => {
    setIsDataOpen(!isDataOpen);
  };

  const toggleMenu = () => {
    if (menuPressed) {
      Animated.timing(menuAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMenuPressed(false));
    } else {
      Animated.timing(menuAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setMenuPressed(true);
        menuTimeout = setTimeout(() => {
          Animated.timing(menuAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setMenuPressed(false));
        }, 5000);
      });
    }
  };

  const handleMarkerPress = (id) => {
    if (markerInteractive && owners[id].allowed) {
      setOwnerId(id);
      setIsMarkerPressed(true);
      const { latitude, longitude } = owners[id];
      setMarkerCoordinate({ latitude, longitude });
      setAllowed(false); // Prevent other users from responding to this marker
    }
  };

  const handleRespondPress = () => {
    if (isMarkerPressed) {
      if (!responded) {
        setShowConfirmation(true);
      } else {
        handleArrivePress();
      }
    }
  };

  const handleRespondYes = () => {
    setShowConfirmation(false);
    setShowNavigationBox(true);
    setMarkerInteractive(false);
    setResponded(true);
    // update(ref(DB, `/Owner/${ownerId}`), { allowed: false, rescuer_user_id: rescuerUserId }); // Prevent other users from responding to this marker
    Object.keys(owners).map(key => {
      if (key == ownerId) {
        update(ref(DB, `/Owner/${key}`), { allowed: false, rescuer_user_id: rescuerUserId });
      const backgroundNotif = async () => {
        const channelId = await notifee.createChannel({
          id: 'Background Notification',
          name: 'Alarm Channel',
          vibration: true,
          vibrationPattern: [300, 500],
          sound: 'alarm'
        });

        alarmNotification({ channelId, time: Date.now() + 1000, title: 'Red Alert', body: "BFP is Now responding!"  });
      }
      backgroundNotif();
   
      } else {
        update(ref(DB, `/Owner/${key}`), { rescuer_user_id: null });
      }
    })

    const url = `https://www.google.com/maps/dir/?api=1&destination=${markerCoordinate.latitude},${markerCoordinate.longitude}`;
    Linking.openURL(url);
  };

  const handleNo = () => {
    setShowConfirmation(false);
    setIsMarkerPressed(false);
    setMarkerInteractive(true);
    setMarkerCoordinate(null);
    setAllowed(true); // Allow other users to respond to this marker
  };

  const confirmNavigation = () => {
    Alert.alert(
      'Confirm',
      'Do you want to Logout?',
      [
        {
          text: 'No',
          onPress: () => console.log('Stay on Rescuer Interface'),
          style: 'cancel',
        },
        { text: 'Yes', onPress: () => handleMenuYes() },
      ],
      { cancelable: false }
    );
  };

  const handleMenuYes = () => {
    setShowConfirmation(false);
    if (isMarkerPressed && !arrived) {
      Alert.alert(
        'Reminder',
        'Please arrive at the destination before logging out.',
        [{ text: 'OK', onPress: () => console.log('Reminder acknowledged') }],
        { cancelable: false }
      );
    } else {
      update(ref(DB, `/Owner/${ownerId}`), { allowed: true });
      navigation.navigate('RescuerLoginScreen'); // Navigate to LoginScreen
    }
  };

  const handleArrivePress = () => {
    Alert.alert(
      'Confirm',
      'Have you arrived at the destination?',
      [
        {
          text: 'No',
          onPress: () => console.log('Not yet arrived'),
          style: 'cancel',
        },
        { text: 'Yes', onPress: () => handleArrivalConfirmed() },
      ],
      { cancelable: false }
    );
  };

  const handleArrivalConfirmed = () => {
    const dataRef = ref(DB, `/Owner/${ownerId}`);
    update(dataRef, { arrived: true, allowed: true }); // Set allowed to true after arriving
    setIsMarkerPressed(false);
    setOwnerId('');
    setMarkerInteractive(true);
    setResponded(false);
    setAllowed(true); // Allow other users to respond to this marker

    // Show another confirmation asking for Assistance
    Alert.alert(
      'Confirm',
      'Do you need Assistance?',
      [
        {
          text: 'No',
          onPress: () => {
            update(ref(DB, `/Owner/${ownerId}`), { assistance: false, allowed: true });
            console.log('No Assistance needed')
          },
          style: 'cancel',
        },
        { text: 'Yes', onPress: () => handleBackupConfirmed() },
      ],
      { cancelable: false }
    );
  };

  const handleBackupConfirmed = async () => {
    update(ref(DB, `/Owner/${ownerId}`), { arrived: false, allowed: true, assistance: true }); // Set arrived to false and allowed to true
  };

  const requestBackup = () => {
    // Find the previous marker that has arrived
    // const prevArrivedMarker = markers.reverse().find(marker => marker.arrived);
    const markerNeedsAssitance = markers.find(marker => marker.arrived && marker.rescuer_user_id == rescuerUserId);
    
    if (markerNeedsAssitance) {
      // Update the database to set arrived to false
      update(ref(DB, `/Owner/${markerNeedsAssitance.key}`), { allowed: true, arrived: false, assistance: true });
    
      // Show reminder to request another Assistance
      Alert.alert(
        'Reminder',
        'Requesting For Assistance!',
        [{ text: 'OK', onPress: () => console.log('Assistance reminder acknowledged') }],
        { cancelable: false }
      );
    } else {
      // If no marker has arrived, show a message
      Alert.alert(
        'No Assistance Needed',
        'There are no markers that have arrived yet.',
        [{ text: 'OK', onPress: () => console.log('No assistance needed') }],
        { cancelable: false }
      );
    }
  };
  
  const handleLogout = () => {
    if (isMarkerPressed && !arrived && !responded) {
      Alert.alert(
        'Reminder',
        'Please respond to the incident or confirm arrival before logging out.',
        [{ text: 'OK', onPress: () => console.log('Reminder acknowledged') }],
        { cancelable: false }
      );
    } else {
      confirmNavigation();
    }
  };

  return (
<View style={styles.container}>
  <MapView
    style={styles.map}
    initialRegion={{
      latitude: 14.4823,
      longitude: 120.9167,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    }}
  >
    {markers && markers.length > 0 && markers.map(marker => (
      !marker.arrived && marker.latitude && marker.longitude && (
        <Marker
          key={`${marker.key}-${marker.color}`}
          coordinate={{ latitude: parseFloat(marker.latitude), longitude: parseFloat(marker.longitude)}}
          onPress={() => handleMarkerPress(marker.key)}
          pinColor={marker.color}
        />
      )
    ))}
  </MapView>

  {isDataOpen && (
    <>
      <Animated.View style={[styles.dataBox, { width: 313, height: 580, top: 10, zIndex: 1 }]}>
        <View style={[styles.header, { zIndex: 2 }]}>
          <Text style={styles.headerText}>REAL-TIME DATA GATHERED</Text>
        </View>
        <View style={styles.dataTable}>
          <View style={styles.dataTableCol}>
            <Text style={[styles.dataTableText, styles.dataTableTextHeader]}>Time</Text>
            {time.map((value, index) => <Text key={`${value}-${index}`} style={styles.dataTableText}>{value}</Text>)}
          </View>
          <View style={styles.dataTableCol}>
            <Text style={[styles.dataTableText, styles.dataTableTextHeader]}>Temp</Text>
            {temp.map((value, index) => <Text key={`${value}-${index}`} style={styles.dataTableText}>{value}</Text>)}
          </View>
          <View style={styles.dataTableCol}>
            <Text style={[styles.dataTableText, styles.dataTableTextHeader]}>Smoke</Text>
            {smoke.map((value, index) => <Text key={`${value}-${index}`} style={styles.dataTableText}>{value}</Text>)}
          </View>
          <View style={styles.dataTableCol}>
            <Text style={[styles.dataTableText, styles.dataTableTextHeader]}>Fire</Text>
            {fire.map((value, index) => <Text key={`${value}-${index}`} style={styles.dataTableText}>{value}</Text>)}
          </View>
        </View>
        <ScrollView horizontal={true}>
          {barChartData.datasets[0].data.length > 0 && <View style={{ width: '100%', paddingVertical: 15, paddingHorizontal: 10}}>
          <BarChart
            data={barChartData}
            width={Math.max(barChartData.datasets[0].data.length * 90, 150)}
            height={270}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 2, // optional, defaults to 2dp
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            style={{
              marginVertical: 20,
            }}
            verticalLabelRotation={30}
            fromZero={true}
          /></View>}
        </ScrollView>
      </Animated.View>
    </>
  )}

  <TouchableOpacity style={styles.dataButton} onPress={toggleDataBox}>
    <Text style={styles.buttonText}>Data</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
    <Text style={styles.buttonText}>Menu</Text>
  </TouchableOpacity>

  <Animated.View style={[styles.menuOptionContainer, { opacity: menuAnimation }]}>
    <TouchableOpacity
      style={styles.menuOption}
      onPress={requestBackup}
    >
      <Text style={styles.buttonText}>Req. for Assistance</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.menuOption}
      onPress={handleLogout}
    >
      <Text style={styles.buttonText}>Logout</Text>
    </TouchableOpacity>
  </Animated.View>

  <View style={styles.outerContainer}>
        <View style={styles.squareContainer}>
          <View style={[styles.square, styles.redSquare]}>
          </View><Text style={styles.text}>Device still active</Text>
          <View style={[styles.square, styles.greenSquare]}>
          </View><Text style={styles.text}>Rescuer on route</Text>
          <View style={[styles.square, styles.yellowSquare]}>
          </View><Text style={styles.text}>Device possibly broken</Text>
        </View>
      </View>

  <TouchableOpacity
    style={[styles.respondButton, { backgroundColor: isMarkerPressed ? '#3AC23B' : 'gray' }]}
    onPress={handleRespondPress}
    disabled={!isMarkerPressed}
  >
    <Text style={styles.buttonText}>{isMarkerPressed ? (responded ? 'Arrive' : 'Respond') : 'Respond'}</Text>
  </TouchableOpacity>

  {showConfirmation && (
    <View style={styles.confirmationBox}>
      <Text style={{ color: 'black' }}>Do you wish to respond?</Text>
      <TouchableOpacity style={styles.choiceButton} onPress={handleRespondYes}>
        <Text style={styles.buttonText}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.choiceButton} onPress={handleNo}>
        <Text style={styles.buttonText}>No</Text>
      </TouchableOpacity>
    </View>
  )}

  {showNavigationBox && (
    <Animated.View style={[styles.navigationBox, { opacity: fadeAnimation }]}>
      <Text style={{ color: 'black' }}>Providing navigation, please wait!</Text>
    </Animated.View>
  )}

  <View style={[styles.imageContainer, ownerId !== '' ? styles.imageContainerShow : '']}>
    <View style={styles.imageValuesContainer}>
      <Image source={require('../assets/Heat.png')} style={styles.image} />
      <Text style={styles.imageValuesText}>{owners[ownerId]?.Temperature}</Text>
    </View>
    <View style={styles.imageValuesContainer}> 
      <Image source={require('../assets/Smoke.png')} style={styles.image} />
      <Text style={styles.imageValuesText}>{owners[ownerId] && owners[ownerId]?.Smoke && owners[ownerId]?.Smoke >= 150 ? 'Detected' : 'Not Detected'}</Text>
    </View>
    <View style={styles.imageValuesContainer}> 
      <Image source={require('../assets/Fire.png')} style={styles.image} />
      <Text style={styles.imageValuesText}>{owners[ownerId]?.Fire ? 'Detected' : 'Not Detected'}</Text>
    </View>
  </View>
</View>


  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 10,
    width: 75,
    height: 110,
    backgroundColor: 'rgba(128, 128, 128, 0.5)',
    borderRadius: 15,
  },
  dataBox: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingTop: 40,
    justifyContent: 'flex-start',
    alignItems: 'center',
    elevation: 5,
    alignSelf: 'center',
  },
  dataButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 80,
    height: 40,
    backgroundColor: '#5A92C6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 80,
    height: 40,
    backgroundColor: '#5A92C6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOptionContainer: {
    position: 'absolute',
    bottom: 70,
    right: 20,
    backgroundColor: '#5A92C6',
    borderRadius: 20,
    padding: 10,
    right: 10,
  },
  menuOption: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 100,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
    borderRadius: 20,
  },
  respondButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  confirmationBox: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    alignSelf: 'center',
    bottom: screenHeight * 0.3,
  },
  choiceButton: {
    backgroundColor: 'red',
    borderRadius: 20,
    width: 100,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  navigationBox: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    alignSelf: 'center',
    bottom: screenHeight * 0.30,
  },
  header: {
		position: 'absolute',
		top: 0,
		backgroundColor: 'red',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 10,
		justifyContent: 'center',
		alignItems: 'center',
		left: 0,
    width: '100%'
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageContainer: {
    display: 'none',
    position: 'absolute',
    top: 50,
    left: 15,
    padding: 10,
    backgroundColor: 'rgba(128, 128, 128, 0.5)',
    borderRadius: 15,
  },
  imageContainerShow: {
    display: 'flex'
  },
  imageValuesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageValuesText: {
    color: '#fff'
  },
  image: {
    width: 30,
    height: 30,
    marginVertical: 5,
    marginRight: 10
  },
  dataTable: {
    marginTop: 20,
    paddingHorizontal: 5,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly'
  },
  dataTableCol: {
    flexDirection: 'column',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dataTableText: {
    color: 'black'
  },
  dataTableTextHeader: {
    fontWeight: '700'
  },
  outerContainer: {
    position: 'absolute',
    top: 200,
    left: 15,
    padding: 10,
    backgroundColor: 'rgba(128, 128, 128, 0.5)',
    borderRadius: 15,
    width: 140,
    height: 100,
    },
    squareContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    },
    square: {
    width: 10,
    height: 10,
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    right: 53,
    },
    redSquare: {
    backgroundColor: 'red',
    },
    greenSquare: {
    backgroundColor: 'green',
    },
    yellowSquare: {
    backgroundColor: 'yellow',
    },
    text: {
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 12,
    left: 9,
    bottom: 15
    },
});
