import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";

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
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 24,
        zIndex: 101,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        backgroundColor: 'rgba(0,0,0,0.91)',
      }} pointerEvents="none">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.91)',
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          overflow: 'hidden',
        }}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.91)',
            opacity: 1,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
          }} />
        </View>
      </View>
      <View style={styles.navBar}>
        {/* Left side - Home and Shop */}
        <View style={styles.leftSide}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('home')}>
            <Ionicons name="home" size={32} color={activeTab === 'home' ? "#3b82f6" : "#ccc"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('shop')}>
            <Feather name="shopping-bag" size={32} color={activeTab === 'shop' ? "#3b82f6" : "#ccc"} />
          </TouchableOpacity>
        </View>

        {/* Center FAB (Order) - properly centered */}
        <View style={styles.fabWrapper} pointerEvents="box-none">
          <TouchableOpacity style={styles.fab} onPress={handleOrderPress} activeOpacity={0.85}>
            <Animated.Image
              source={require("../../assets/images/TURGI.png")}
              style={[styles.fabIcon, { transform: [{ rotate: spin }] }]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>

        {/* Right side - Profile and Team */}
        <View style={styles.rightSide}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('team')}>
            <MaterialIcons name="people-outline" size={32} color={activeTab === 'team' ? "#3b82f6" : "#ccc"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('profile')}>
            <Ionicons name="person" size={32} color={activeTab === 'profile' ? "#3b82f6" : "#ccc"} />
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
    backgroundColor: "rgba(0, 0, 0, 0.91)", // Black with 91% opacity
    paddingTop: 28,
    paddingBottom: 12,
    paddingHorizontal: 20,
    alignItems: "flex-end",
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
  },
  fabWrapper: {
    position: "absolute",
    left: "57%", // היה 50%
    top: -28,
    transform: [{ translateX: -40 }], // היה -36, כדי לשמור על מרכזיות יחסית
    zIndex: 10,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    pointerEvents: "box-none",
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: 72, // הגדלנו את העיגול
    height: 72, // הגדלנו את העיגול
    borderRadius: 36,
    backgroundColor: "#0b0518",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#181828",
  },
  fabIcon: {
    width: 44, // הגדלנו את האייקון
    height: 44, // הגדלנו את האייקון
    borderRadius: 22,
  },
  homeIndicatorWrapper: {
    alignItems: "center",
    width: "100%",
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  homeIndicator: {
    width: 152,
    height: 5,
    backgroundColor: "#fff",
    borderRadius: 999,
    opacity: 0.7,
  },
});