import { useState } from "react";

function AddGroup({ onAddGroup }: { onAddGroup: (groupName: string) => void }) {
    const [addingGroup, setAddingGroup] = useState(false);
    const [groupName, setGroupName] = useState("");

    function handleAddGroup() {
        onAddGroup(groupName)
        setGroupName("")
        setAddingGroup(false)
    }

    return (
        <div>
            {addingGroup ? (
                <>
                <input
                    type="text"
                    placeholder="Group Name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                />
                <button onClick={() => handleAddGroup()}>Add</button>
                </>
            ) : (
                <button onClick={() => setAddingGroup(true)}>+ Add Group</button>
            )}
        </div>
    )
}



export default AddGroup