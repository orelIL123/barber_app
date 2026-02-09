import { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { IconWrapper } from './IconWrapper';

type ScissorsLoaderProps = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /**
   * Ionicons name; default is the safest option used elsewhere in the app.
   * If you prefer the filled icon, set `iconName="cut"`.
   */
  iconName?: string;
};

export function ScissorsLoader({
  size = 80,
  color = '#007bff',
  style,
  accessibilityLabel = 'טוען',
  iconName = 'cut-outline',
}: ScissorsLoaderProps) {
  const loadingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(loadingAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [loadingAnim]);

  const rotate = loadingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '15deg'],
  });

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <IconWrapper name={iconName} size={size} color={color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});


