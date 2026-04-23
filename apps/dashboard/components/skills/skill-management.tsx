"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SkillEntry {
  id: string;
  skillName: string;
  description: string | null;
  registeredAt: string;
}

interface SkillManagementProps {
  skills: SkillEntry[];
  addAction: (skillName: string, description?: string) => Promise<void>;
  updateAction: (
    id: string,
    skillName: string,
    description?: string,
  ) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}

export function SkillManagement({
  skills,
  addAction,
  updateAction,
  deleteAction,
}: SkillManagementProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillEntry | null>(null);
  const [skillName, setSkillName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openAddDialog() {
    setEditingSkill(null);
    setSkillName("");
    setDescription("");
    setDialogOpen(true);
  }

  function openEditDialog(skill: SkillEntry) {
    setEditingSkill(skill);
    setSkillName(skill.skillName);
    setDescription(skill.description ?? "");
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!skillName.trim()) return;
    setSubmitting(true);
    try {
      if (editingSkill) {
        await updateAction(
          editingSkill.id,
          skillName.trim(),
          description.trim() || undefined,
        );
      } else {
        await addAction(skillName.trim(), description.trim() || undefined);
      }
      setDialogOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("このスキルを削除してもよろしいですか？")) return;
    await deleteAction(id);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>配布スキル管理</CardTitle>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4" data-icon="inline-start" />
            追加
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>スキル名</TableHead>
              <TableHead>説明</TableHead>
              <TableHead>登録日</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {skills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  配布スキルが登録されていません
                </TableCell>
              </TableRow>
            ) : (
              skills.map((skill) => (
                <TableRow key={skill.id}>
                  <TableCell className="font-medium">
                    {skill.skillName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {skill.description ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {skill.registeredAt.slice(0, 10)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEditDialog(skill)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(skill.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSkill ? "スキルを編集" : "スキルを追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="skill-name">スキル名 *</Label>
              <Input
                id="skill-name"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="例: commit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-desc">説明</Label>
              <Input
                id="skill-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: コミットメッセージを生成するスキル"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !skillName.trim()}
            >
              {submitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
