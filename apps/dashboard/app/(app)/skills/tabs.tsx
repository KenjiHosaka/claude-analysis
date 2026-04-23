"use client";

import { type ReactNode } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

interface SkillPageTabsProps {
  analysisContent: ReactNode;
  managementContent: ReactNode;
}

export function SkillPageTabs({
  analysisContent,
  managementContent,
}: SkillPageTabsProps) {
  return (
    <Tabs defaultValue="analysis">
      <TabsList>
        <TabsTrigger value="analysis">活用分析</TabsTrigger>
        <TabsTrigger value="management">スキル管理</TabsTrigger>
      </TabsList>
      <TabsContent value="analysis">{analysisContent}</TabsContent>
      <TabsContent value="management">{managementContent}</TabsContent>
    </Tabs>
  );
}
