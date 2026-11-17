import { Ionicons } from "@expo/vector-icons";
import { keys } from "@settlemint/client/data/queries";
import { parseSplitwiseExport, type SplitwiseExport } from "@settlemint/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import { api } from "@/lib/api";
import { useTheme } from "@/theme/theme";
import { Button, IconButton } from "@/ui/button";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Avatar } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

const MAX_BYTES = 2 * 1024 * 1024;

async function readText(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  // The web preview hands over a browser File; phones a file on disk.
  if (Platform.OS === "web" && asset.file) return asset.file.text();
  return new File(asset.uri).text();
}

/** Bring a group over from Splitwise: pick the export, say which person is you, done. */
export default function ImportSplitwise() {
  const { c, radius } = useTheme();
  const qc = useQueryClient();
  const t = useTranslations("import");
  const tc = useTranslations("common");
  const [csv, setCsv] = useState<string | null>(null);
  const [parsed, setParsed] = useState<SplitwiseExport | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [me, setMe] = useState<number | null>(null);
  const [name, setName] = useState("");

  const choose = async () => {
    setFileError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/comma-separated-values", "text/plain", "*/*"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    if ((asset.size ?? 0) > MAX_BYTES) return setFileError(t("tooBig"));
    const text = await readText(asset);
    const result = parseSplitwiseExport(text);
    if (result.people.length === 0) return setFileError(t("noPeople"));
    setCsv(text);
    setParsed(result);
    setMe(null);
    const base = asset.name.replace(/\.csv$/i, "").replace(/[_-]+/g, " ").replace(/\d{4} \d{2} \d{2}.*$/, "").trim();
    setName(base ? base.charAt(0).toLocaleUpperCase() + base.slice(1) : t("defaultName"));
  };

  const run = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () => api.importSplitwise({ csv: csv!, groupName: name.trim(), meIndex: me! }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: keys.groups });
      router.back();
      router.push({ pathname: "/group/[id]", params: { id: res.groupId } });
      toast.success(t("done", { expenses: res.expenses, payments: res.payments }), {
        description: res.skipped.length ? t("skipped", { count: res.skipped.length }) : t("balancesMatch"),
      });
    },
    onError: () => toast.error(t("failed")),
  });

  const expenses = parsed?.rows.filter((r) => !r.isPayment).length ?? 0;
  const payments = parsed?.rows.filter((r) => r.isPayment).length ?? 0;

  return (
    <Screen
      sheet
      title={t("title")}
      headerRight={<IconButton icon="close" label={tc("close")} onPress={() => router.back()} />}
      footer={
        <View style={{ gap: 8 }}>
          <Text variant="caption" tone="subtle">
            {t("note")}
          </Text>
          <Button size="lg" block disabled={!parsed || me === null || !name.trim()} loading={run.isPending} onPress={() => run.mutate()}>
            {t("import")}
          </Button>
        </View>
      }
    >
      <View style={{ gap: 4 }}>
        <Text variant="sub" tone="muted">
          1. {t("step1")}
        </Text>
        <Text variant="sub" tone="muted">
          2. {t("step2")}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("fileLabel")}
        onPress={() => void choose()}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 16,
          borderRadius: radius.md,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: c.lineStrong,
          backgroundColor: pressed ? c.surface3 : c.surface2,
        })}
      >
        <Ionicons name="document-attach-outline" size={26} color={c.positive} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{parsed ? t("chooseOther") : t("choose")}</Text>
          {parsed && (
            <Text variant="sub" tone="muted">
              {t("summary", { expenses, payments, people: parsed.people.length })}
              {parsed.problems.length > 0 ? ` · ${t("unreadable", { count: parsed.problems.length })}` : ""}
            </Text>
          )}
        </View>
      </Pressable>
      {fileError ? (
        <Text tone="negative" accessibilityLiveRegion="polite">
          {fileError}
        </Text>
      ) : null}
      {parsed && (
        <>
          <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={t("whichYou")}>
            <Text variant="label" tone="muted">
              {t("whichYou")}
            </Text>
            {parsed.people.map((p, i) => {
              const on = me === i;
              return (
                <Pressable
                  key={p}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setMe(i)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: on ? c.accent : c.line,
                    backgroundColor: on ? c.accentSoft : c.surface,
                  }}
                >
                  <Avatar name={p} size={32} />
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    {p}
                  </Text>
                  {on && <Ionicons name="checkmark" size={20} color={c.positive} />}
                </Pressable>
              );
            })}
            <Text variant="caption" tone="subtle">
              {t("others")}
            </Text>
          </View>
          <Field label={t("groupName")} value={name} onChangeText={setName} maxLength={100} />
        </>
      )}
    </Screen>
  );
}
