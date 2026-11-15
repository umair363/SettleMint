"use client";

import { Archive, Plus, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GroupRow } from "@/features/groups/group-row";
import { NewGroupSheet } from "@/features/groups/new-group-sheet";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { useGroups } from "@/lib/queries";
import { Button, IconButton } from "@/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "@/ui/feedback";
import { Card, List, SectionHeader } from "@/ui/surface";

function Groups() {
  const groups = useGroups();
  const params = useSearchParams();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  // "?new=1" (from the add-expense sheet) opens the new-group sheet.
  const open = creating || params.get("new") === "1";
  const setOpen = (o: boolean) => {
    setCreating(o);
    if (!o && params.get("new")) router.replace("/groups");
  };

  const active = (groups.data ?? []).filter((g) => !g.archived);
  const archived = (groups.data ?? []).filter((g) => g.archived);

  return (
    <>
      <PageHeader
        title="Groups"
        actions={
          <IconButton label="New group" variant="solid" onClick={() => setOpen(true)}>
            <Plus className="size-5" />
          </IconButton>
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
        ) : active.length === 0 && archived.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Users />}
              title="No groups yet"
              body="A group is any set of people who share costs: a trip, a flat, a couple."
              action={
                <Button leading={<Plus className="size-4" />} onClick={() => setOpen(true)}>
                  Create a group
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            {active.length > 0 && (
              <List>
                {active.map((g) => (
                  <GroupRow key={g.id} group={g} />
                ))}
              </List>
            )}
            {archived.length > 0 && (
              <section>
                <SectionHeader
                  title={`Archived (${archived.length})`}
                  action={
                    <Button size="sm" variant="ghost" leading={<Archive className="size-4" />} onClick={() => setShowArchived((s) => !s)}>
                      {showArchived ? "Hide" : "Show"}
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
      </PageBody>
      <NewGroupSheet open={open} onOpenChange={setOpen} />
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
