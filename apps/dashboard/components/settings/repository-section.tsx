"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

interface Repository {
  id: string;
  owner: string;
  name: string;
  url: string;
  createdAt: Date;
}

interface RepositorySectionProps {
  initialRepos: Repository[];
  addAction: (owner: string, name: string) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}

export function RepositorySection({
  initialRepos,
  addAction,
  deleteAction,
}: RepositorySectionProps) {
  const [repos, setRepos] = useState(initialRepos);
  const [repoInput, setRepoInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    const trimmed = repoInput.trim();
    const parts = trimmed.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setError("owner/repo-name の形式で入力してください");
      return;
    }

    const [owner, name] = parts;
    setAdding(true);
    try {
      await addAction(owner, name);
      setRepos((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          owner,
          name,
          url: `https://github.com/${owner}/${name}`,
          createdAt: new Date(),
        },
      ]);
      setRepoInput("");
      setOpen(false);
    } catch {
      setError("リポジトリの追加に失敗しました");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("このリポジトリを削除しますか?")) return;
    try {
      await deleteAction(id);
      setRepos((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // silently ignore
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>リポジトリ</CardTitle>
        <CardDescription>
          分析対象のGitHubリポジトリを管理します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {repos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            リポジトリがまだ登録されていません
          </p>
        ) : (
          <ul className="space-y-2">
            {repos.map((repo) => (
              <li
                key={repo.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-sm font-medium">
                  {repo.owner}/{repo.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(repo.id)}
                >
                  <TrashIcon className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm">
                <PlusIcon data-icon="inline-start" className="size-4" />
                リポジトリを追加
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>リポジトリを追加</DialogTitle>
              <DialogDescription>
                GitHubリポジトリのowner/repo-nameを入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="repo-input">リポジトリ</Label>
              <Input
                id="repo-input"
                placeholder="owner/repo-name"
                value={repoInput}
                onChange={(e) => {
                  setRepoInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" />}
              >
                キャンセル
              </DialogClose>
              <Button onClick={handleAdd} disabled={adding}>
                {adding ? "追加中..." : "追加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
