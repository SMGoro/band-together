document.addEventListener('DOMContentLoaded', () => {
    // 解析 URL 参数以恢复之前选中的人员信息
    const params = new URLSearchParams(window.location.search);
    const selectedIds = params.get('selected') ? params.get('selected').split(',') : [];
    const selectedItems = new Set(selectedIds);

    Promise.all([
        fetch('assets/data/member.json').then(response => response.json()),
        fetch('assets/data/show.json').then(response => response.json())
    ]).then(([memberData, typeData]) => {
        const contentContainer = document.getElementById('content-container');
        const gridContainer = document.getElementById('grid-container');
        const selectedItemsMap = new Map(); // 用于存储选中项的引用
        
        // 创建网格
        for (let i = 1; i <= memberData.gridCount; i++) {
            const gridItem = document.createElement('div');
            gridItem.className = 'grid-item';
            gridItem.id = `grid${i}`;
            gridContainer.appendChild(gridItem);
        }

        // 根据分类生成内容
        typeData.types.forEach(type => {
            const typeContainer = document.createElement('div');
            typeContainer.className = 'type-container';
            typeContainer.innerHTML = `<h2 class="type-title">${type.name}</h2>`;
            contentContainer.appendChild(typeContainer);

            const memberContainer = document.createElement('div');
            memberContainer.className = 'draggable-container';
            typeContainer.appendChild(memberContainer);

            memberData.contents.forEach(member => {
                if (member.tags.some(tag => type.tags.includes(tag))) {
                    const item = createMemberItem(member);
                    memberContainer.appendChild(item);

                    // 如果该成员在之前选中的列表中，标记为已选择并添加到组合区域
                    if (selectedItems.has(member.id)) {
                        item.classList.add('selected');
                        const clonedItem = createMemberItem(member, true);
                        const nextEmptyGrid = findNextEmptyGrid();
                        if (nextEmptyGrid) {
                            nextEmptyGrid.appendChild(clonedItem);
                            selectedItemsMap.set(member.id, clonedItem);
                        }
                    }
                }
            });
        });

        // 创建成员项目元素的函数
        function createMemberItem(member, isGridItem = false) {
            const item = document.createElement('div');
            item.className = 'draggable-item';
            item.draggable = !isGridItem;
            item.id = member.id;
            item.style.backgroundImage = `url(${member.image})`;
            item.innerHTML = `
                <h3 class="text-content">${member.title}</h3>
                <p class="text-content">${member.description}</p>
            `;

            // 只为非网格项添加点击和拖拽事件
            if (!isGridItem) {
                // 添加点击事件处理
                item.addEventListener('click', (event) => {
                    // 如果是拖拽开始或者是组合区域中的项目，不处理点击
                    if (item.classList.contains('dragging') || item.closest('#grid-container')) return;
                    
                    handleItemSelection(item, member);
                });

                // 添加拖拽事件处理
                item.addEventListener('dragstart', (event) => {
                    // 如果是组合区域中的项目，不允许拖拽
                    if (item.closest('#grid-container')) {
                        event.preventDefault();
                        return;
                    }
                    item.classList.add('dragging');
                    event.dataTransfer.setData('text/plain', member.id);
                });

                item.addEventListener('dragend', () => {
                    item.classList.remove('dragging');
                });
            }

            return item;
        }

        // 查找下一个空的网格位置
        function findNextEmptyGrid() {
            const gridItems = document.querySelectorAll('.grid-item');
            for (let grid of gridItems) {
                if (grid.children.length === 0) {
                    return grid;
                }
            }
            return null;
        }

        // 处理选择逻辑
        function handleItemSelection(item, member) {
            if (selectedItems.has(member.id)) {
                // 取消选择
                selectedItems.delete(member.id);
                item.classList.remove('selected');
                
                // 从组合区域移除
                const selectedItem = selectedItemsMap.get(member.id);
                if (selectedItem && selectedItem.parentElement) {
                    selectedItem.parentElement.removeChild(selectedItem);
                }
                selectedItemsMap.delete(member.id);
            } else if (selectedItems.size < memberData.gridCount) {
                // 添加选择
                selectedItems.add(member.id);
                item.classList.add('selected');
                
                // 添加到组合区域
                const clonedItem = createMemberItem(member, true);
                const nextEmptyGrid = findNextEmptyGrid();
                if (nextEmptyGrid) {
                    nextEmptyGrid.appendChild(clonedItem);
                    selectedItemsMap.set(member.id, clonedItem);
                }
            }

            // 更新 URL
            updateURL(selectedItems);
        }

        // 更新 URL 函数
        function updateURL(selectedItems) {
            const newUrl = new URL(window.location.href);
            const selectedArray = Array.from(selectedItems);
            if (selectedArray.length > 0) {
                newUrl.searchParams.set('selected', selectedArray.join(','));
            } else {
                newUrl.searchParams.delete('selected');
            }
            window.history.pushState({}, '', newUrl.toString());
        }

        // 处理选择组合中的双击移除
        let lastTapTime = 0;
        const doubleTapDelay = 300; // 双击判定的时间间隔（毫秒）

        gridContainer.addEventListener('touchend', handleDoubleTap);
        gridContainer.addEventListener('dblclick', handleRemoveItem);

        function handleDoubleTap(event) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTapTime;
            
            if (tapLength < doubleTapDelay && tapLength > 0) {
                // 双击/双触发生
                handleRemoveItem(event);
                event.preventDefault(); // 防止额外的点击事件
            }
            
            lastTapTime = currentTime;
        }

        function handleRemoveItem(event) {
            const item = event.target.closest('.draggable-item');
            if (item && selectedItems.has(item.id)) {
                // 查找并更新原始项的选择状态
                const originalItem = document.getElementById(item.id);
                if (originalItem && !originalItem.closest('#grid-container')) {
                    originalItem.classList.remove('selected');
                }
                
                // 更新数据结构
                selectedItems.delete(item.id);
                selectedItemsMap.delete(item.id);
                
                // 从组合区域移除
                item.parentElement.removeChild(item);
                
                // 更新 URL
                updateURL(selectedItems);
            }
        }

        // 检测是否是移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (!isMobile) {
            // 桌面端拖放处理
            document.addEventListener('dragover', (event) => {
                event.preventDefault();
            });

            document.addEventListener('drop', (event) => {
                event.preventDefault();
                const itemId = event.dataTransfer.getData('text/plain');
                const item = document.getElementById(itemId);
                const member = memberData.contents.find(m => m.id === itemId);
                
                if (item && member && !selectedItems.has(itemId) && selectedItems.size < memberData.gridCount) {
                    handleItemSelection(item, member);
                }
            });
        }

        // 添加保存按钮点击事件
        const saveButton = document.getElementById('save-btn');
        saveButton.addEventListener('click', async () => {
            // 计算总开销
            let totalCost = 0;
            const selectedMembers = [];
            selectedItems.forEach(id => {
                const member = memberData.contents.find(m => m.id === id);
                if (member) {
                    const level = member.tags.find(tag => tag.startsWith('level'));
                    if (level) {
                        totalCost += parseInt(level.replace('level', ''));
                    }
                    selectedMembers.push(member);
                }
            });

            // 创建预览容器
            const previewContainer = document.createElement('div');
            previewContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                overflow: auto;
                padding: 20px;
                box-sizing: border-box;
            `;

            // 创建预览内容容器
            const previewContent = document.createElement('div');
            previewContent.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 15px;
                width: 800px;
                max-width: 90%;
                text-align: center;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                margin: auto;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                scrollbar-width: thin;
                scrollbar-color: #888 #f1f1f1;
            `;

            // 添加自定义滚动条样式
            const style = document.createElement('style');
            style.textContent = `
                .preview-content::-webkit-scrollbar {
                    width: 8px;
                }
                .preview-content::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }
                .preview-content::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 4px;
                }
                .preview-content::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
            `;
            document.head.appendChild(style);
            previewContent.classList.add('preview-content');

            // 创建要保存的内容容器
            const saveContent = document.createElement('div');
            saveContent.style.cssText = `
                background: white;
                padding: 20px;
                width: 100%;
                margin-bottom: 20px;
                box-sizing: border-box;
            `;

            // 添加标题
            const title = document.createElement('h1');
            title.textContent = '15元组乐队';
            title.style.cssText = `
                margin-bottom: 20px;
                font-size: 28px;
                color: #333;
            `;
            saveContent.appendChild(title);

            // 添加开销信息
            const costInfo = document.createElement('div');
            costInfo.style.cssText = `
                margin: 15px 0;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
                font-size: 20px;
                font-weight: bold;
                color: ${totalCost <= 15 ? '#4CAF50' : '#f44336'};
                border: 2px solid ${totalCost <= 15 ? '#4CAF50' : '#f44336'};
            `;
            costInfo.textContent = `总开销: ${totalCost}￥ ${totalCost <= 15 ? '(预算内)' : '(超出预算)'}`;
            saveContent.appendChild(costInfo);

            // 添加成员列表
            const memberList = document.createElement('div');
            memberList.style.cssText = `
                margin: 15px 0;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
                text-align: left;
            `;
            
            // 创建成员网格布局
            const memberGrid = document.createElement('div');
            memberGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 10px;
                margin-top: 10px;
            `;
            
            memberGrid.innerHTML = selectedMembers.map(member => {
                const level = member.tags.find(tag => tag.startsWith('level'));
                const cost = level ? parseInt(level.replace('level', '')) : 0;
                return `<div style="
                    padding: 8px;
                    background: white;
                    border-radius: 5px;
                    border: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div style="flex: 1;">
                        <strong>${member.title}</strong><br>
                        <small>${member.description}</small>
                    </div>
                    <div style="
                        background: ${cost > 3 ? '#ff9800' : '#4CAF50'};
                        color: white;
                        padding: 3px 8px;
                        border-radius: 12px;
                        font-size: 14px;
                    ">${cost}￥</div>
                </div>`;
            }).join('');

            memberList.innerHTML = '<h3 style="margin: 0 0 10px 0; color: #333;">乐队成员</h3>';
            memberList.appendChild(memberGrid);
            saveContent.appendChild(memberList);

            // 复制网格内容
            const gridClone = document.getElementById('grid-container').cloneNode(true);
            gridClone.style.cssText = `
                transform: scale(0.8);
                transform-origin: top center;
                margin: 20px 0;
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
            `;
            saveContent.appendChild(gridClone);

            // 生成并添加二维码
            const qrContainer = document.createElement('div');
            qrContainer.style.cssText = `
                margin: 20px auto;
                width: 128px;
                height: 128px;
                padding: 10px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            `;
            
            new QRCode(qrContainer, {
                text: window.location.href,
                width: 128,
                height: 128,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H,
                margin: 2
            });

            saveContent.appendChild(qrContainer);
            previewContent.appendChild(saveContent);

            // 添加按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-top: 20px;
                position: sticky;
                bottom: 0;
                background: white;
                padding: 15px 0;
                border-top: 1px solid #eee;
            `;

            // 添加保存和取消按钮
            const saveConfirmBtn = document.createElement('button');
            saveConfirmBtn.textContent = '保存图片';
            saveConfirmBtn.style.cssText = `
                padding: 12px 30px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                transition: background 0.3s;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            `;

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                padding: 12px 30px;
                background: #f44336;
                color: white;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                transition: background 0.3s;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            `;

            buttonContainer.appendChild(saveConfirmBtn);
            buttonContainer.appendChild(cancelBtn);
            previewContent.appendChild(buttonContainer);
            previewContainer.appendChild(previewContent);
            document.body.appendChild(previewContainer);

            // 绑定按钮事件
            saveConfirmBtn.onclick = async () => {
                // 进行截图
                html2canvas(saveContent, {
                    width: saveContent.offsetWidth,
                    height: saveContent.offsetHeight,
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                }).then(canvas => {
                    // 保存图片
                    const imgData = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.download = 'band-together.png';
                    link.href = imgData;
                    link.click();
                    document.body.removeChild(previewContainer);
                });
            };

            cancelBtn.onclick = () => {
                document.body.removeChild(previewContainer);
            };
        });

        // 添加重新开始按钮点击事件
        const restartButton = document.getElementById('restart-btn');
        restartButton.addEventListener('click', () => {
            selectedItems.clear();
            selectedItemsMap.clear();
            document.querySelectorAll('.draggable-item').forEach(item => {
                item.classList.remove('selected');
            });
            document.querySelectorAll('.grid-item').forEach(grid => {
                grid.innerHTML = '';
            });
            updateURL(selectedItems);
        });
    });
});