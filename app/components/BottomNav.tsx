import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";
import { Animated, Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const { width: screenWidth } = Dimensions.get('window');
const TAB_HEIGHT = 80;
const FAB_RADIUS = screenWidth < 380 ? 39 : 43;
const FAB_MARGIN = 8;
const CENTER_WIDTH = (FAB_RADIUS + FAB_MARGIN) * 2.2;

export default function BottomNav({ onOrderPress, onTabPress, activeTab }: {
  onOrderPress?: () => void;
  onTabPress?: (tab: string) => void;
  activeTab?: string;
}) {
  const spinValue = useRef(new Animated.Value(0)).current;

  const handleOrderPress = () => {
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      spinValue.setValue(0);
    });
    onOrderPress?.();
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // SVG curved background — same as fast app
  const center = screenWidth / 2;
  const curveStart = center - CENTER_WIDTH / 2;
  const curveEnd = center + CENTER_WIDTH / 2;
  const curveDepth = FAB_RADIUS + 10;

  const d = `
    M0,0
    L${curveStart},0
    C${curveStart + CENTER_WIDTH * 0.2},0 ${center - CENTER_WIDTH * 0.2},${curveDepth} ${center},${curveDepth}
    C${center + CENTER_WIDTH * 0.2},${curveDepth} ${curveEnd - CENTER_WIDTH * 0.2},0 ${curveEnd},0
    L${screenWidth},0
    L${screenWidth},${TAB_HEIGHT + 50}
    L0,${TAB_HEIGHT + 50}
    Z
  `;

  return (
    <View style={styles.wrapper}>
      {/* SVG curved background */}
      <View style={styles.svgContainer}>
        <Svg width={screenWidth} height={TAB_HEIGHT + 50} style={styles.svg}>
          <Path d={d} fill="#000000" />
        </Svg>
      </View>

      <View style={styles.navBar}>
        {/* Left side */}
        <View style={styles.leftSide}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('home')}>
            <Ionicons name="home" size={26} color={activeTab === 'home' ? "#3b82f6" : "#ccc"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('shop')}>
            <Feather name="shopping-bag" size={26} color={activeTab === 'shop' ? "#3b82f6" : "#ccc"} />
          </TouchableOpacity>
        </View>

        {/* Center FAB — exact structure from fast app */}
        <View style={styles.centerFab}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.2)']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity style={styles.fab} onPress={handleOrderPress} activeOpacity={0.85}>
              <Animated.View style={[styles.fabIcon, { transform: [{ rotate: spin }] }]}>
                <Image
                  source={require("../../assets/images/icon_booking_tab.png")}
                  style={styles.fabIcon}
                  contentFit="cover"
                  transition={0}
                  cachePolicy="memory-disk"
                />
              </Animated.View>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Right side */}
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
    height: TAB_HEIGHT,
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  svg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  navBar: {
    flexDirection: "row",
    backgroundColor: "transparent",
    paddingTop: 15,
    paddingHorizontal: 20,
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    height: "100%",
    zIndex: 100,
  },
  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30,
    flex: 1,
    justifyContent: "flex-start",
    paddingLeft: 10,
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30,
    flex: 1,
    justifyContent: "flex-end",
    paddingRight: 10,
  },
  iconBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  // LinearGradient container — same dimensions + border glow as fast app
  fabGradient: {
    width: screenWidth < 380 ? 78 : 86,
    height: screenWidth < 380 ? 78 : 86,
    borderRadius: screenWidth < 380 ? 39 : 43,
    padding: 2,
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: "hidden",  // clips the oversized image into a circle natively
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  fabIcon: {
    width: screenWidth < 380 ? 74 : 82,
    height: screenWidth < 380 ? 74 : 82,
  },
  centerFab: {
    position: 'absolute',
    top: -22,
    left: screenWidth / 2 - (screenWidth < 380 ? 39 : 43),
    zIndex: 101,
  },
  homeIndicatorWrapper: {
    position: 'absolute',
    bottom: 8,
    alignItems: "center",
    width: "100%",
    zIndex: 102,
  },
  homeIndicator: {
    width: 130,
    height: 5,
    backgroundColor: "#fff",
    borderRadius: 100,
    opacity: 0.3,
  },
});