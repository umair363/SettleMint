"use client";

import { Archive, FileUp, Plus, UserPlus, Users } from "@/ui/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "use-intl";
import { Suspense, useState } from "react";
import { GroupRow } from "@/features/groups/group-row";
import { listablePeople, PersonRow } from "@/features/people/people";
import { ImportSheet } from "@/features/groups/import-sheet";
import { NewFriendSheet, NewGroupSheet } from "@/features/groups/new-group-sheet";
import { SearchButton } from "@/features/search/search-palette";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { useGroups, usePeople } from "@settlemint/client/data/queries";
import { Button, IconButton } from "@/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "@/ui/feedback";
import { Card, List, SectionHeader } from "@/ui/surface";

function Groups() {
  const groups = useGroups();
  const people = listablePeople(usePeople().data);
  const tp = useTranslations("people");
  const params = useSearchParams();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [friendOpen, setFriendOpen] = useState(false);
  const t = useTranslations("groups");
  // "?new=1" (from the add-expense sheet) opens the new-group sheet.
  const open = creating || params.get("new") === "1";
  const setOpen = (o: boolean) => {
    setCreating(o);
    if (!o && params.get("new")) router.replace("/groups");
  };

  const active = (groups.data ?? []).filter((g) => !g.archived && g.type !== "direct");
  const friends = (groups.data ?? []).filter((g) => !g.archived && g.type === "direct");
  const archived = (groups.data ?? []).filter((g) => g.archived);

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <>
          <SearchButton />
          <IconButton label={t("addFriend")} variant="solid" onClick={() => setFriendOpen(true)}>
            <UserPlus className="size-5" />
          </IconButton>
          <IconButton label={t("newGroup")} variant="solid" onClick={() => setOpen(true)}>
            <Plus className="size-5" />
          </IconButton>
          </>
        }
      />
      <PageBody>
        {groups.isPending ? (
          <Card>
            <SkeletonRows count={4} />
          </Card>
        ) : groups.error ? (
          <Card>
            <ErrorState onRetry={() => groups.refetch()} />
          </Card>
        ) : active.length === 0 && friends.length === 0 && archived.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Users />}
              title={t("emptyTitle")}
              body={t("emptyBody")}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button leading={<UserPlus className="size-4" />} onClick={() => setFriendOpen(true)}>
                    {t("addFriend")}
                  </Button>
                  <Button variant="secondary" leading={<Plus className="size-4" />} onClick={() => setOpen(true)}>
                    {t("create")}
                  </Button>
                </div>
              }
            />
          </Card>
        ) : (
          <>
            {friends.length > 0 && (
              <section>
                <SectionHeader title={t("friends")} />
                <List>
                  {friends.map((g) => (
                    <GroupRow key={g.id} group={g} />
                  ))}
                </List>
              </section>
            )}
            {people.length > 0 && (
              <section>
                <SectionHeader title={tp("title")} />
                <List>
                  {people.map((p) => (
                    <PersonRow key={p.key} person={p} />
                  ))}
                </List>
              </section>
            )}
            {active.length > 0 && (
              <section>
                {(friends.length > 0 || people.length > 0) && <SectionHeader title={t("sectionGroups")} />}
                <List>
                  {active.map((g) => (
                    <GroupRow key={g.id} group={g} />
                  ))}
                </List>
              </section>
            )}
            {archived.length > 0 && (
              <section>
                <SectionHeader
                  title={t("archived", { count: archived.length })}
                  action={
                    <Button size="sm" variant="ghost" leading={<Archive className="size-4" />} onClick={() => setShowArchived((s) => !s)}>
                      {showArchived ? t("hide") : t("show")}
                    </Button>
                  }
                />
                {showArchived && (
                  <List>
                    {archived.map((g) => (
                      <GroupRow key={g.id} group={g} />
                    ))}
                  </List>
                )}
              </section>
            )}
          </>
        )}
        <Button variant="ghost" block leading={<FileUp className="size-4" />} onClick={() => setImportOpen(true)}>
          {t("import")}
        </Button>
      </PageBody>
      <NewGroupSheet open={open} onOpenChange={setOpen} />
      <NewFriendSheet open={friendOpen} onOpenChange={setFriendOpen} />
      <ImportSheet open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}

export default function GroupsPage() {
  return (
    <Suspense>
      <Groups />
    </Suspense>
  );
}
