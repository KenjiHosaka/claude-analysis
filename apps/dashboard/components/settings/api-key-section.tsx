"use client";

import { useState } from "react";
import { CopyIcon, CheckIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ApiKeySectionProps {
  initialKey: { keyPrefix: string; createdAt: string } | null;
  generateAction: () => Promise<string>;
}

export function ApiKeySection({
  initialKey,
  generateAction,
}: ApiKeySectionProps) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyInfo, setKeyInfo] = useState(initialKey);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const rawKey = await generateAction();
      setNewKey(rawKey);
      setKeyInfo({
        keyPrefix: rawKey.slice(0, 7),
        createdAt: new Date().toISOString(),
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>APIキー</CardTitle>
        <CardDescription>
          コレクターCLIからデータを送信するために使用します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {newKey ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              このキーは一度だけ表示されます。安全な場所に保存してください。
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">
                {newKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
            </div>
          </div>
        ) : keyInfo ? (
          <div className="space-y-1">
            <p className="text-sm font-mono">
              {keyInfo.keyPrefix}{"****...****"}
            </p>
            <p className="text-xs text-muted-foreground">
              作成日: {new Date(keyInfo.createdAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            APIキーがまだ生成されていません
          </p>
        )}

        <Button
          onClick={handleGenerate}
          disabled={generating}
          variant={keyInfo ? "outline" : "default"}
        >
          {generating
            ? "生成中..."
            : keyInfo
              ? "キーを再生成"
              : "キーを生成"}
        </Button>
      </CardContent>
    </Card>
  );
}
