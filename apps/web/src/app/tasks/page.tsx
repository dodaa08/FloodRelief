import type { Metadata } from "next";
import { TasksPage } from "@/components/tasks/tasks-page";

export const metadata: Metadata = {
  title: "My tasks",
  description: "Work you claimed as a responder. Complete it when help is delivered.",
};

export default function Tasks() {
  return <TasksPage />;
}