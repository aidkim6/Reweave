import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProjectSort from '../Project/ProjectSort.jsx'; 

function StorageSort() {
    const navigate = useNavigate();
    const { state } = useLocation();
    const categories = state?.categories ?? [];
    const savedRef = useRef(false); 

    const projectList = categories.map((c) => ({ id: c.id, title: c.name }));

    const handleSave = (sortedItems) => {
        const sorted = sortedItems
            .map((item) => categories.find((c) => c.id === item.id))
            .filter(Boolean);
        savedRef.current = true;
        navigate('/bookmark', { replace: true, state: { categories: sorted } });
    };

    const handleClose = () => {
        if (savedRef.current) return;
        navigate('/bookmark', { replace: true, state: { categories } });
    };

    return (
        <ProjectSort
            projectList={projectList}
            onSave={handleSave}
            onClose={handleClose}
        />
    );
}

export default StorageSort;
