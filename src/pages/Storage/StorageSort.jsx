import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectSort from '../Project/ProjectSort.jsx';
import { api } from '../../features/client';

function StorageSort() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const savedRef = useRef(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/api/categories');
                const data = res.data.data ?? res.data;
                setCategories(
                    data.categories.map((c) => ({ id: c.categoryId, name: c.categoryName }))
                );
            } catch (e) {
                console.log('카테고리 목록 실패', e.response?.status, e.response?.data);
            } finally {
                setLoaded(true);
            }
        };
        fetchCategories();
    }, []);

    const projectList = categories.map((c) => ({ id: c.id, title: c.name }));

    const handleSave = async (sortedItems) => {
        try {
            await api.patch('/api/categories/order', {
                categoryIds: sortedItems.map((item) => item.id),
            });
            savedRef.current = true;
            navigate('/bookmark', { replace: true });
        } catch (e) {
            console.log('순서 저장 실패', e.response?.status, e.response?.data);
        }
    };

    const handleClose = () => {
        if (savedRef.current) return;
        navigate('/bookmark', { replace: true });
    };

    if (!loaded) return null;

    return (
        <ProjectSort
            projectList={projectList}
            onSave={handleSave}
            onClose={handleClose}
        />
    );
}

export default StorageSort;