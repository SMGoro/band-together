document.addEventListener('DOMContentLoaded', () => {
    // 解析 URL 参数以恢复之前选中的人员信息
    const params = new URLSearchParams(window.location.search);
    const selectedIds = params.get('selected') ? params.get('selected').split(',') : [];

    Promise.all([
        fetch('assets/data/member.json').then(response => response.json()),
        fetch('assets/data/show.json').then(response => response.json())
    ]).then(([memberData, typeData]) => {
        const contentContainer = document.getElementById('content-container');
        const gridContainer = document.getElementById('grid-container');
        
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
            typeContainer.innerHTML = `<h2>${type.name}</h2>`;
            contentContainer.appendChild(typeContainer);

            const memberContainer = document.createElement('div');
            memberContainer.className = 'draggable-container';
            typeContainer.appendChild(memberContainer);

            memberData.contents.forEach(member => {
                if (member.tags.some(tag => type.tags.includes(tag))) {
                    const item = document.createElement('div');
                    item.className = 'draggable-item';
                    item.draggable = true;
                    item.id = member.id;
                    item.style.backgroundImage = `url(${member.image})`;
                    item.innerHTML = `
                        <h3 class="text-content">${member.title}</h3>
                        <p class="text-content">${member.description}</p>
                    `;
                    memberContainer.appendChild(item);

                    // 如果该成员在之前选中的列表中，则将其添加到格子中
                    if (selectedIds.includes(member.id)) {
                        const gridItem = document.getElementById(`grid${selectedIds.indexOf(member.id) + 1}`);
                        gridItem.appendChild(item);
                    }
                }
            });
        });

        // 添加拖动功能（保持不变）
        
        const draggableItems = document.querySelectorAll('.draggable-item');
        const gridItems = document.querySelectorAll('.grid-item');

        let draggedItem = null;
        const originalPositions = {};
    
        // 保存每个可拖动内容的原始位置
        draggableItems.forEach(item => {
            originalPositions[item.id] = item.parentNode;
        });
    
        draggableItems.forEach(item => {
            item.addEventListener('dragstart', (event) => {
                draggedItem = event.target;
                event.target.style.opacity = 0.5;
            });
    
            item.addEventListener('dragend', (event) => {
                event.target.style.opacity = 1;
            });
    
            // 添加触摸事件监听器
            item.addEventListener('touchstart', (event) => {                    
                const target = event.target.closest('.draggable-item');
                if (target) {
                    draggedItem = target;
                }
            });
    
            item.addEventListener('touchend', (event) => {
                // 防止触摸事件冒泡
                // event.stopPropagation();
            });
        });
    
        gridItems.forEach(grid => {
            grid.addEventListener('dragover', (event) => {
                event.preventDefault();
            });
    
            grid.addEventListener('drop', (event) => {
                event.preventDefault();
                if (grid.children.length === 0) {
                    grid.appendChild(draggedItem);
                }
            });
    
            // 监听拖动出格子的事件
            grid.addEventListener('dragleave', (event) => {
                if (event.target === grid && grid.children.length > 0) {
                    // 将内容放回原位
                    const itemId = grid.firstChild.id;
                    const originalPosition = originalPositions[itemId];
                    originalPosition.appendChild(grid.firstChild);
                }
            });
    
            // 添加触摸事件监听器
            grid.addEventListener('touchend', () => {
                if (grid.children.length === 0 && draggedItem) {
                    grid.appendChild(draggedItem);
                    draggedItem = null;
                } else if (grid.children.length > 0) {
                    // 将格子内的内容放回原位
                    const itemId = grid.firstChild.id;
                    const originalPosition = originalPositions[itemId];
                    originalPosition.appendChild(grid.firstChild);
                }
    
                // 高亮闪烁效果
                grid.classList.add('highlight');
                setTimeout(() => {
                    grid.classList.remove('highlight');
                }, 500);
            });
        });
        
        // 添加保存按钮点击事件
        const saveButton = document.getElementById('save-btn');
        saveButton.addEventListener('click', () => {
            const selectedItems = Array.from(document.querySelectorAll('.grid-item .draggable-item')).map(item => item.id);
            const selectedParam = selectedItems.join(',');
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('selected', selectedParam);
            window.history.pushState({}, '', newUrl.toString());
            const bandChosenContainer = document.getElementById('band-chosen');
            const qrCodeElement = document.getElementById('qrcode');
        
            // 生成二维码
            new QRCode(qrCodeElement, {
                text: window.location.href,
                width: 128,
                height: 128,
            });
        
            html2canvas(bandChosenContainer, {
                width: 750, // 指定输出图片的宽度
                height: 1200 // 指定输出图片的高度
            }).then(canvas => {
                // 将二维码添加到画布上
                const qrCodeContext = canvas.getContext('2d');
                const qrCodeImage = new Image();
                qrCodeImage.src = qrCodeElement.querySelector('img').src;
                qrCodeImage.onload = function() {
                    qrCodeContext.drawImage(qrCodeImage, canvas.width - 128, canvas.height - 128, 128, 128);
        
                    // 保存图片
                    const imgData = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.download = 'band-together.png';
                    link.href = imgData;
                    link.click();
                };
            });
        });

        // 添加重新开始按钮点击事件
        const restartButton = document.getElementById('restart-btn');
        restartButton.addEventListener('click', () => {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('selected');
            window.location.href = newUrl.toString();
        });

    });
});