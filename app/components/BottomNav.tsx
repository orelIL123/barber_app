import { Feather, Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Animated, Dimensions, Image, StyleSheet, TouchableOpacity, View } from "react-native";

const { width: screenWidth } = Dimensions.get('window');

// Bundled asset — loaded exactly like gallery fallback images in HomeScreen.
// Just require() — no resolveAssetSource, no Asset.fromModule, no URI.
const TAB_LOGO = require('../../assets/images/icon_booking_tab.png');

// Warm the native image cache once, at module-load time (runs once per JS
// process lifetime, never on re-render). This ensures the image is decoded
// before BottomNav first mounts, eliminating the first-render flicker.
// Uses only react-native's Image — no new dependencies, no native build needed.
(function warmFabImage() {
  try {
    const uri = Image.resolveAssetSource(TAB_LOGO)?.uri;
    if (uri) Image.prefetch(uri).catch(() => { /* silent – image still loads normally */ });
  } catch (_) { /* silent */ }
})();

export default function BottomNav({ onOrderPress, onTabPress, activeTab }: {
  onOrderPress?: () => void;
  onTabPress?: (tab: string) => void;
  activeTab?: string;
}) {
  const spinValue = useRef(new Animated.Value(0)).current;

  const handleOrderPress = () => {
    // Start spinning animation
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      // Reset animation value for next tap
      spinValue.setValue(0);
    });
    
    // Call the original onOrderPress
    onOrderPress?.();
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  return (
    <View style={styles.wrapper}>
      <View style={styles.topBleed} pointerEvents="none" />
      <View style={styles.navBar}>
        {/* Left side - Home and Shop */}
        <View style={styles.leftSide}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('home')}>
            <Ionicons name="home" size={26} color={activeTab === 'home' ? "#3b82f6" : "#ccc"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('shop')}>
            <Feather name="shopping-bag" size={26} color={activeTab === 'shop' ? "#3b82f6" : "#ccc"} />
          </TouchableOpacity>
        </View>

        {/* Center FAB (Order) - properly centered */}
        <View style={styles.centerFab}>
          <View style={styles.fabGradient}>
            <TouchableOpacity style={styles.fab} onPress={handleOrderPress} activeOpacity={0.85}>
              <Animated.View style={[styles.fabIconWrap, { transform: [{ rotate: spin }] }]}>
                <Image
                  source={TAB_LOGO}
                  style={styles.fabIcon}
                  resizeMode="cover"
                  fadeDuration={0}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right side - Profile and Settings */}
        <View style={styles.rightSide}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('settings')}>
            <Ionicons name="settings" size={26} color={activeTab === 'settings' ? "#3b82f6" : "#ccc"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('profile')}>
            <Ionicons name="person" size={26} color={activeTab === 'profile' ? "#3b82f6" : "#ccc"} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Home indicator */}
      <View style={styles.homeIndicatorWrapper}>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    backgroundColor: "transparent",
    alignItems: "center",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  navBar: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.91)",
    paddingTop: 0, // ultra thin
    paddingBottom: 0, // ultra thin
    paddingHorizontal: 20,
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30, // מרווח שווה בין האייקונים
    flex: 1,
    justifyContent: "flex-start",
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30, // מרווח שווה בין האייקונים
    flex: 1,
    justifyContent: "flex-end",
  },
  iconBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 0, // ensure icons are at the top
  },
  topBleed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
    zIndex: 101,
    backgroundColor: 'rgba(0,0,0,0.91)',
  },
  fabGradient: {
    width: screenWidth < 380 ? 78 : 86,
    height: screenWidth < 380 ? 78 : 86,
    borderRadius: screenWidth < 380 ? 39 : 43,
    padding: 2,
    transform: [{ translateY: -20 }],
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 30,
  },
  fab: {
    width: '100%',
    height: '100%',
    borderRadius: screenWidth < 380 ? 37 : 41,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fabIconWrap: {
    width: screenWidth < 380 ? 70 : 78,
    height: screenWidth < 380 ? 70 : 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    width: screenWidth < 380 ? 70 : 78,
    height: screenWidth < 380 ? 70 : 78,
    borderRadius: screenWidth < 380 ? 35 : 39,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 25,
    elevation: 25,
  },
  homeIndicatorWrapper: {
    alignItems: "center",
    width: "100%",
    paddingVertical: 2,
    backgroundColor: "transparent",
    marginTop: 0, // remove extra margin
  },
  homeIndicator: {
    width: 152,
    height: 3, // was 5
    backgroundColor: "#fff",
    borderRadius: 999,
    opacity: 0.5, // lighter
  },
  centerFab: {
    flex: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 0,
    position: 'relative',
    top: 0,
  },
});