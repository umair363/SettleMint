// This route is never actually navigated to — the "add" tab's
// tabBarButton (see ../_layout.tsx) fully replaces the default touchable
// and opens the AddExpenseSheet instead of pushing this screen. The file
// still needs to exist for expo-router to register the tab.
export default function AddPlaceholder() {
  return null;
}
