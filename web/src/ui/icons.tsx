// The web app's icon set: Phosphor (MIT), drawn in one consistent stroke.
// Exported under the names the app already uses, so screens import from one
// place. Icons are decorative by default (hidden from screen readers); give a
// control its name with aria-label on the control, not on the icon.
// Works in server components (the landing page) and client components alike.
import type { Icon as PhosphorIcon, IconProps as PhosphorProps, IconWeight } from "@phosphor-icons/react";
import {
  AirplaneTiltIcon,
  ArchiveIcon,
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  ArrowSquareOutIcon,
  ArrowsLeftRightIcon,
  BackspaceIcon,
  BasketIcon,
  BedIcon,
  BellIcon,
  CalendarBlankIcon,
  CameraIcon,
  CarIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  CircleNotchIcon,
  ClockCounterClockwiseIcon,
  CloudSlashIcon,
  ConfettiIcon,
  CopyIcon,
  DesktopIcon,
  DownloadSimpleIcon,
  EnvelopeSimpleIcon,
  EqualsIcon,
  ExportIcon,
  FileArrowUpIcon,
  FilmSlateIcon,
  FirstAidKitIcon,
  ForkKnifeIcon,
  GearSixIcon,
  HandshakeIcon,
  HeartIcon,
  HouseIcon,
  HouseSimpleIcon,
  KeyIcon,
  LightningIcon,
  LinkSimpleIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  PercentIcon,
  PlusIcon,
  PulseIcon,
  ReceiptIcon,
  ScanIcon,
  PathIcon,
  RepeatIcon,
  ScalesIcon,
  ShareNetworkIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SignOutIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  SunIcon,
  TagIcon,
  TranslateIcon,
  TrashIcon,
  TrayIcon,
  UserIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersThreeIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { ComponentProps } from "react";

export type IconProps = Omit<PhosphorProps, "ref"> & {
  /** Accepted for familiarity: 2.3 and above draws the bold weight. */
  strokeWidth?: number | string;
} & Pick<ComponentProps<"svg">, "aria-hidden">;

export type AppIcon = (props: IconProps) => React.JSX.Element;

function icon(Ph: PhosphorIcon, defaultWeight: IconWeight = "regular"): AppIcon {
  function AppIconComponent({ strokeWidth, weight, "aria-hidden": hidden = true, ...props }: IconProps) {
    const fromStroke = strokeWidth !== undefined && Number(strokeWidth) >= 2.3 ? "bold" : undefined;
    return <Ph aria-hidden={hidden} weight={weight ?? fromStroke ?? defaultWeight} {...props} />;
  }
  return AppIconComponent;
}

// Interface
export const Activity = icon(PulseIcon);
export const Archive = icon(ArchiveIcon);
export const ArrowRight = icon(ArrowRightIcon);
export const ArrowRightLeft = icon(ArrowsLeftRightIcon);
export const Bell = icon(BellIcon);
export const Calendar = icon(CalendarBlankIcon);
export const Camera = icon(CameraIcon);
export const Check = icon(CheckIcon, "bold");
export const ChevronDown = icon(CaretDownIcon);
export const ChevronLeft = icon(CaretLeftIcon);
export const ChevronRight = icon(CaretRightIcon);
export const CloudOff = icon(CloudSlashIcon);
export const Copy = icon(CopyIcon);
export const Delete = icon(BackspaceIcon);
export const Download = icon(DownloadSimpleIcon);
export const Equal = icon(EqualsIcon);
export const ExternalLink = icon(ArrowSquareOutIcon);
export const FileUp = icon(FileArrowUpIcon);
export const History = icon(ClockCounterClockwiseIcon);
export const House = icon(HouseIcon);
export const Inbox = icon(TrayIcon);
export const KeyRound = icon(KeyIcon);
export const Languages = icon(TranslateIcon);
export const Link2 = icon(LinkSimpleIcon);
export const ListChecks = icon(ListChecksIcon);
export const LoaderCircle = icon(CircleNotchIcon, "bold");
export const LogOut = icon(SignOutIcon);
export const Mail = icon(EnvelopeSimpleIcon);
export const Monitor = icon(DesktopIcon);
export const Moon = icon(MoonIcon);
export const Pencil = icon(PencilSimpleIcon);
export const Percent = icon(PercentIcon);
export const Plus = icon(PlusIcon, "bold");
export const Receipt = icon(ReceiptIcon);
export const ScanLine = icon(ScanIcon);
export const Route = icon(PathIcon);
export const RefreshCw = icon(ArrowsClockwiseIcon);
export const Repeat = icon(RepeatIcon);
export const Scale = icon(ScalesIcon);
export const Search = icon(MagnifyingGlassIcon);
export const Send = icon(PaperPlaneTiltIcon);
export const Settings = icon(GearSixIcon);
export const Settings2 = icon(GearSixIcon);
export const Share = icon(ExportIcon);
export const Share2 = icon(ShareNetworkIcon);
export const ShieldCheck = icon(ShieldCheckIcon);
export const SlidersHorizontal = icon(SlidersHorizontalIcon);
export const Sparkles = icon(SparkleIcon);
export const Sun = icon(SunIcon);
export const Trash2 = icon(TrashIcon);
export const TriangleAlert = icon(WarningIcon);
export const UserMinus = icon(UserMinusIcon);
export const UserPlus = icon(UserPlusIcon);
export const UserRound = icon(UserIcon);
export const Users = icon(UsersThreeIcon);
export const X = icon(XIcon);

// Meaning glyphs (see packages/client/src/design/glyphs.ts): what a group or an expense is.
const GLYPHS: Record<string, PhosphorIcon> = {
  AirplaneTilt: AirplaneTiltIcon,
  HouseSimple: HouseSimpleIcon,
  Heart: HeartIcon,
  Confetti: ConfettiIcon,
  UsersThree: UsersThreeIcon,
  Handshake: HandshakeIcon,
  ForkKnife: ForkKnifeIcon,
  Car: CarIcon,
  Bed: BedIcon,
  FilmSlate: FilmSlateIcon,
  ShoppingBag: ShoppingBagIcon,
  Lightning: LightningIcon,
  Basket: BasketIcon,
  FirstAidKit: FirstAidKitIcon,
  Tag: TagIcon,
};

/** Draws a glyph by its Phosphor name from glyphs.ts. */
export function Glyph({ name, ...props }: IconProps & { name: string }) {
  const Ph = GLYPHS[name] ?? TagIcon;
  return <Ph aria-hidden weight="duotone" {...props} />;
}
