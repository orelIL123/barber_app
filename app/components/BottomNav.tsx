import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

export default function BottomNav({ onOrderPress, onTabPress, activeTab }: {
  onOrderPress?: () => void;
  onTabPress?: (tab: string) => void;
  activeTab?: string;
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.navBar}>
        {/* Home */}
        <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('home')}>
          <Ionicons name="home" size={28} color={activeTab === 'home' ? "#3b82f6" : "#ccc"} />
        </TouchableOpacity>
        {/* Shop */}
        <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('shop')}>
          <Feather name="shopping-bag" size={28} color={activeTab === 'shop' ? "#3b82f6" : "#ccc"} />
        </TouchableOpacity>
        {/* Center FAB (Order) */}
        <View style={styles.fabWrapper} pointerEvents="box-none">
          <TouchableOpacity style={styles.fab} onPress={onOrderPress} activeOpacity={0.85}>
            <Image
              source={require("../../assets/images/TURGI.png")}
              style={styles.fabIcon}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
        {/* Team */}
        <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('team')}>
          <MaterialIcons name="people-outline" size={28} color={activeTab === 'team' ? "#3b82f6" : "#ccc"} />
        </TouchableOpacity>
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
  },
  navBar: {
    flexDirection: "row",
    backgroundColor: "#0a0a16",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 28,
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: "100%",
    position: "relative",
  },
  iconBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  fabWrapper: {
    position: "absolute",
    left: "50%",
    top: -32,
    transform: [{ translateX: -32 }],
    zIndex: 10,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    pointerEvents: "box-none",
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#0b0518",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#181828",
  },
  fabIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
