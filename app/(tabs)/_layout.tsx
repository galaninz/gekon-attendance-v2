import React from "react";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Так как у нас один экран — таббар скрываем полностью
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" />
      {/* Explore удалили */}
    </Tabs>
  );
}