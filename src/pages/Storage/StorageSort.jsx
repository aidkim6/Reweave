import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import backIcon from '../../assets/back-arrow.svg';
import sortIcon from '../../assets/project/sort.svg';
import './StorageSort.scss';
import { api } from '../../features/client';

function StorageSort() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const savedRef = useRef(false);
    const [saving, setSaving] = useState(false);
    const draggingId = useRef(null);

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

    const moveCategory = (targetId) => {
        const sourceId = draggingId.current;
        if (sourceId === null || sourceId === targetId) return;
        setCategories((current) => {
            const from = current.findIndex((item) => item.id === sourceId);
            const to = current.findIndex((item) => item.id === targetId);
            if (from < 0 || to < 0) return current;
            const next = [...current];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            return next;
        });
    };

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        try {
            await api.patch('/api/categories/order', {
                categoryIds: categories.map((item) => item.id),
            });
            savedRef.current = true;
            navigate('/bookmark', { replace: true });
        } catch (e) {
            console.log('순서 저장 실패', e.response?.status, e.response?.data);
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        if (savedRef.current) return;
        navigate('/bookmark', { replace: true });
    };

    if (!loaded) return null;

    return (
        <div className="storage-sort-wrap">
            <header className="sort-header">
                <div className="header-left">
                    <button type="button" onClick={handleClose} aria-label="뒤로가기">
                        <img src={backIcon} alt="" />
                    </button>
                    <h1>카테고리 순서 편집</h1>
                </div>
                <button type="button" className="save-btn" disabled={saving} onClick={handleSave}>
                    {saving ? '저장 중' : '저장'}
                </button>
            </header>
            <ul className="sort-list">
                {categories.map((category) => (
                    <li key={category.id} data-category-id={category.id}>
                        <span>{category.name}</span>
                        <button
                            type="button"
                            className="drag-handle"
                            aria-label={`${category.name} 순서 이동, 위아래 방향키로 변경`}
                            onPointerDown={(event) => {
                                draggingId.current = category.id;
                                event.currentTarget.setPointerCapture(event.pointerId);
                            }}
                            onPointerMove={(event) => {
                                if (draggingId.current === null) return;
                                const row = document.elementFromPoint(event.clientX, event.clientY)
                                    ?.closest('.storage-sort-wrap [data-category-id]');
                                if (row) moveCategory(Number(row.dataset.categoryId));
                            }}
                            onPointerUp={() => { draggingId.current = null; }}
                            onPointerCancel={() => { draggingId.current = null; }}
                            onLostPointerCapture={() => { draggingId.current = null; }}
                            onKeyDown={(event) => {
                                if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
                                event.preventDefault();
                                const index = categories.findIndex((item) => item.id === category.id);
                                const target = categories[index + (event.key === 'ArrowUp' ? -1 : 1)];
                                if (target) {
                                    draggingId.current = category.id;
                                    moveCategory(target.id);
                                    draggingId.current = null;
                                }
                            }}
                        >
                            <img src={sortIcon} alt="" draggable={false} />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default StorageSort;
