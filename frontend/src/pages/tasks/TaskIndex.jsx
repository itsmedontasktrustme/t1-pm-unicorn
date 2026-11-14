/* Desktop side panel when no task is selected (HK-72). Hidden on phones. */
function TaskIndex() {
  return (
    <div className="hk-card hk-tasks__panel hk-tasks__placeholder">
      <p>Select a task to see its details.</p>
    </div>
  );
}

export default TaskIndex;
