import { useState, useReducer } from "react";

import SubjectCreate from "../screens/SubjectCreate";
import AnchorCanvas from "../screens/AnchorCanvas";
import SubjectDashboard from "../screens/SubjectDashboard";

import { reducer } from "../state/subjectReducer";
import { useWatcherSocket } from "../hooks/useWatcherSocket";



const initialState = {
  subjects: {},
};

export default function App() {
  // 🔹 Existing subject creation flow (unchanged)
  const [subject, setSubject] = useState<any>(null);

  // 🔹 NEW: global observable state for watcher-driven UI
  const [state, dispatch] = useReducer(reducer, initialState);

  // 🔹 NEW: connect Python watcher → reducer
  useWatcherSocket(dispatch);

  // Step 1: create subject (unchanged)
  if (!subject) {
    return <SubjectCreate onCreated={setSubject} />;
  }

  // Step 2: anchor ingestion screen (unchanged)
  // Step 3+: live dashboard runs in parallel and observes filesystem
  return (
    <>
      <AnchorCanvas
        subjectId={subject.subjectId}
        sex={subject.sex}
        ethnicity={subject.ethnicity}
      />

      {/* 🔹 NEW: Live preview + progress + confirmations */}
      <SubjectDashboard state={state} />
    </>
  );
}
