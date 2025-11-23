class Whiteboard {
    constructor() {
        this.canvas = document.getElementById('drawing-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.currentSize = 5;
        this.isFilled = false;
        this.history = [];
        this.historyStep = -1;
        
        // 形状绘制相关
        this.startX = 0;
        this.startY = 0;
        this.tempCanvas = null;
        
        this.initCanvas();
        this.bindEvents();
        this.setupTools();
    }
    
    initCanvas() {
        // 获取窗口尺寸
        const toolbarHeight = document.querySelector('.toolbar').offsetHeight;
        const headerHeight = document.querySelector('header').offsetHeight;
        
        // 计算可用空间
        const availableWidth = window.innerWidth - 40;
        const availableHeight = window.innerHeight - headerHeight - toolbarHeight - 40;
        
        // 设置画布尺寸
        this.canvas.width = Math.max(availableWidth, 400);
        this.canvas.height = Math.max(availableHeight, 300);
        
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // 创建临时画布用于预览
        this.tempCanvas = document.createElement('canvas');
        this.tempCanvas.width = this.canvas.width;
        this.tempCanvas.height = this.canvas.height;
        
        // 设置白色背景
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.saveState();
    }
    
    bindEvents() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // 触摸事件支持
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
        
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    setupTools() {
        // 工具按钮
        document.getElementById('brush-btn').addEventListener('click', () => this.setTool('brush'));
        document.getElementById('eraser-btn').addEventListener('click', () => this.setTool('eraser'));
        document.getElementById('line-btn').addEventListener('click', () => this.setTool('line'));
        document.getElementById('arrow-btn').addEventListener('click', () => this.setTool('arrow'));
        document.getElementById('rect-btn').addEventListener('click', () => this.setTool('rect'));
        document.getElementById('circle-btn').addEventListener('click', () => this.setTool('circle'));
        document.getElementById('dashed-btn').addEventListener('click', () => this.setTool('dashed'));
        
        // 颜色和大小
        document.getElementById('color-picker').addEventListener('change', (e) => {
            this.currentColor = e.target.value;
        });
        
        const sizeSlider = document.getElementById('brush-size');
        const sizeDisplay = document.getElementById('size-display');
        sizeSlider.addEventListener('input', (e) => {
            this.currentSize = e.target.value;
            sizeDisplay.textContent = e.target.value + 'px';
        });
        
        // 填充选项
        document.getElementById('fill-toggle').addEventListener('change', (e) => {
            this.isFilled = e.target.checked;
        });
        
        // 操作按钮
        document.getElementById('clear-btn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('save-btn').addEventListener('click', () => this.saveImage());
    }
    
    setTool(tool) {
        this.currentTool = tool;
        
        // 更新按钮状态
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${tool}-btn`).classList.add('active');
        
        // 更新鼠标样式
        const cursorMap = {
            'brush': 'crosshair',
            'eraser': 'grab',
            'line': 'crosshair',
            'arrow': 'crosshair',
            'rect': 'crosshair',
            'circle': 'crosshair',
            'dashed': 'crosshair'
        };
        this.canvas.style.cursor = cursorMap[tool] || 'crosshair';
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        
        if (['brush', 'eraser'].includes(this.currentTool)) {
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
            
            if (this.currentTool === 'eraser') {
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.lineWidth = this.currentSize * 2;
            } else {
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.strokeStyle = this.currentColor;
                this.ctx.lineWidth = this.currentSize;
            }
        } else {
            // 保存当前画布状态用于预览
            this.tempCanvas.getContext('2d').clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
            this.tempCanvas.getContext('2d').drawImage(this.canvas, 0, 0);
        }
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getMousePos(e);
        
        if (this.currentTool === 'brush') {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.currentSize;
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        } else if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.lineWidth = this.currentSize * 2;
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        } else {
            // 绘制形状预览
            this.drawShapePreview(pos);
        }
    }
    
    drawShapePreview(currentPos) {
        // 清除画布并恢复原始状态
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.tempCanvas, 0, 0);
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.currentSize;
        this.ctx.fillStyle = this.currentColor;
        
        const width = currentPos.x - this.startX;
        const height = currentPos.y - this.startY;
        
        switch (this.currentTool) {
            case 'line':
                this.drawLine(this.startX, this.startY, currentPos.x, currentPos.y);
                break;
            case 'arrow':
                this.drawArrow(this.startX, this.startY, currentPos.x, currentPos.y);
                break;
            case 'rect':
                this.drawRectangle(this.startX, this.startY, width, height);
                break;
            case 'circle':
                this.drawCircle(this.startX, this.startY, currentPos.x, currentPos.y);
                break;
            case 'dashed':
                this.drawDashedLine(this.startX, this.startY, currentPos.x, currentPos.y);
                break;
        }
    }
    
    drawLine(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }
    
    drawArrow(x1, y1, x2, y2) {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 15;
        
        // 绘制直线
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        
        // 绘制箭头
        this.ctx.beginPath();
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
        this.ctx.stroke();
    }
    
    drawRectangle(x, y, width, height) {
        if (this.isFilled) {
            this.ctx.fillRect(x, y, width, height);
        }
        this.ctx.strokeRect(x, y, width, height);
    }
    
    drawCircle(x1, y1, x2, y2) {
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        this.ctx.beginPath();
        this.ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
        
        if (this.isFilled) {
            this.ctx.fill();
        }
        this.ctx.stroke();
    }
    
    drawDashedLine(x1, y1, x2, y2) {
        this.ctx.save();
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.saveState();
        }
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
    
    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                        e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }
    
    clearCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.saveState();
    }
    
    saveState() {
        this.historyStep++;
        if (this.historyStep < this.history.length) {
            this.history.length = this.historyStep;
        }
        this.history.push(this.canvas.toDataURL());
    }
    
    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            const canvasPic = new Image();
            canvasPic.src = this.history[this.historyStep];
            canvasPic.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(canvasPic, 0, 0);
            };
        }
    }
    
    saveImage() {
        try {
            // 验证画布尺寸
            if (this.canvas.width === 0 || this.canvas.height === 0) {
                console.error('Canvas has no dimensions');
                alert('画布尺寸错误，请刷新页面重试');
                return;
            }
            
            // 创建保存画布
            const saveCanvas = document.createElement('canvas');
            saveCanvas.width = this.canvas.width;
            saveCanvas.height = this.canvas.height;
            const saveCtx = saveCanvas.getContext('2d');
            
            // 确保白色背景
            saveCtx.fillStyle = 'white';
            saveCtx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);
            
            // 复制当前内容
            saveCtx.drawImage(this.canvas, 0, 0);
            
            // 获取图片数据
            const dataURL = saveCanvas.toDataURL('image/png', 1.0);
            
            // 创建下载
            const link = document.createElement('a');
            link.download = `whiteboard_${new Date().toISOString().slice(0, 10)}_${Date.now()}.png`;
            link.href = dataURL;
            
            // 添加到文档并触发下载
            document.body.appendChild(link);
            link.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(link);
                saveCanvas.remove();
            }, 100);
            
        } catch (error) {
            console.error('Error saving image:', error);
            alert('保存图片失败，请重试');
        }
    }
    
    handleResize() {
        // 保存当前内容
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // 重新计算尺寸
        const toolbarHeight = document.querySelector('.toolbar').offsetHeight;
        const headerHeight = document.querySelector('header').offsetHeight;
        
        const availableWidth = window.innerWidth - 40;
        const availableHeight = window.innerHeight - headerHeight - toolbarHeight - 40;
        
        this.canvas.width = Math.max(availableWidth, 400);
        this.canvas.height = Math.max(availableHeight, 300);
        
        // 恢复内容
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(tempCanvas, 0, 0);
        
        // 更新临时画布
        this.tempCanvas.width = this.canvas.width;
        this.tempCanvas.height = this.canvas.height;
        
        tempCanvas.remove();
    }
}

// 初始化白板
document.addEventListener('DOMContentLoaded', () => {
    const whiteboard = new Whiteboard();
    
    // 防止页面滚动
    document.body.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
});