import { useState } from "react";

function AddGroup({ onAddGroup }: { onAddGroup: (groupName: string, groupUserName: string) => void }) {
    const [addingGroup, setAddingGroup] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [userName, setUserName] = useState("");

    function handleAddGroup() {
        onAddGroup(groupName, userName)
        setGroupName("")
        setUserName("")
        setAddingGroup(false)
    }

    return (
        <div className="create-group-card">
            {addingGroup ? (
                <div className="create-group-form">
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">New shared tab</span>
                            <h2>Create a group</h2>
                        </div>
                        <button className="icon-button subtle" onClick={() => setAddingGroup(false)} aria-label="Cancel">×</button>
                    </div>
                    <label className="field">
                        <span>Group name</span>
                        <input
                            type="text"
                            placeholder="Weekend in Penang"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        <span>Your name in this group</span>
                        <input
                            type="text"
                            placeholder="Kai"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                        />
                    </label>
                    <button className="button primary full" disabled={!groupName.trim() || !userName.trim()} onClick={handleAddGroup}>
                        Create group
                    </button>
                </div>
            ) : (
                <button className="create-group-prompt" onClick={() => setAddingGroup(true)}>
                    <span className="create-icon">+</span>
                    <span>
                        <strong>Start a new group</strong>
                        <small>Trip, home, dinner—anything shared.</small>
                    </span>
                </button>
            )}
        </div>
    )
}



export default AddGroup
