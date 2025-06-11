const canvas = document.getElementById('canvas');
const arrowsSVG = document.getElementById('arrows');
const deleteArrowBtn = document.getElementById('delete-arrow-btn');
let currentDragged = null;
let blocks = [];
let arrows = [];
let connectionDrag = {active: false, fromBlock: null, fromPos: null};
let selectedArrowIndex = null;

document.querySelectorAll('.figure').forEach(fig => {
    fig.addEventListener('dragstart', (e) => {
        currentDragged = e.target.getAttribute('data-type') || e.target.parentElement.getAttribute('data-type');
    });
});

canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', (e) => {
    if (currentDragged) {
        const x = e.offsetX, y = e.offsetY;
        const div = document.createElement('div');
        div.className = 'block';
        div.setAttribute('data-type', currentDragged);
        div.style.left = (x-45)+'px';
        div.style.top = (y-20)+'px';
        div.tabIndex = 0;
        div.setAttribute('data-id', Date.now() + '' + Math.random().toString().slice(2,6));

        let svgCode = '';
        switch(currentDragged){
            case 'startend':
                svgCode = `<ellipse cx="45" cy="20" rx="40" ry="18" fill="#80deea" stroke="#222" stroke-width="2"/>`;
                break;
            case 'io':
                svgCode = `<polygon points="10,5 80,5 70,35 20,35" fill="#ffcc80" stroke="#222" stroke-width="2"/>`;
                break;
            case 'process':
                svgCode = `<rect x="10" y="5" width="70" height="30" rx="4" fill="#aed581" stroke="#222" stroke-width="2"/>`;
                break;
            case 'decision':
                svgCode = `<polygon points="45,5 85,20 45,35 5,20" fill="#b39ddb" stroke="#222" stroke-width="2"/>`;
                break;
        }
        let defaultLabel = {
            "startend":"Start",
            "io":"Input/Output",
            "process":"Process",
            "decision":"Decision"
        }[currentDragged] || "Step";
        div.innerHTML = `
        <div class="block-inner">
            <svg width="90" height="40" style="position:absolute;left:0;top:0;">${svgCode}</svg>
        </div>
        <input class="block-input" maxlength="25" value="${defaultLabel}" />
    `;
        addConnectionPoints(div);
        addDeleteBlockBtn(div);

        div.draggable = true;
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', '');
            div.setAttribute('data-dragging', 'true');
        });
        div.addEventListener('dragend', (e) => {
            const rect = canvas.getBoundingClientRect();
            div.style.left = (e.pageX - rect.left - 45) + 'px';
            div.style.top = (e.pageY - rect.top - 20) + 'px';
            updateArrows();
            div.removeAttribute('data-dragging');
        });
        canvas.appendChild(div);
        blocks.push(div);
        updateArrows();
    }
    currentDragged = null;
});

function addDeleteBlockBtn(div) {
    const btn = document.createElement('button');
    btn.innerText = '×';
    btn.className = 'delete-block-btn';
    btn.title = 'Delete block';
    btn.onclick = (e) => {
        e.stopPropagation();
        arrows = arrows.filter(a => a.from !== div && a.to !== div);
        blocks = blocks.filter(b => b !== div);
        div.remove();
        updateArrows();
    };
    div.appendChild(btn);
}

function addConnectionPoints(div) {
    const points = [
        {left: '83px', top: '15px',  dir:'right'},
        {left: '-7px', top: '15px',  dir:'left'},
        {left: '40px', top: '-7px',  dir:'top'},
        {left: '40px', top: '35px',  dir:'bottom'},
    ];
    points.forEach(pt => {
        const cp = document.createElement('div');
        cp.className = 'connection-point';
        cp.style.left = pt.left;
        cp.style.top = pt.top;
        cp.dataset.dir = pt.dir;
        cp.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            connectionDrag.active = true;
            connectionDrag.fromBlock = div;
            connectionDrag.fromDir = pt.dir;
            connectionDrag.line = createTempArrow(e.pageX, e.pageY);
            document.addEventListener('mousemove', onDragLine);
            document.addEventListener('mouseup', onStopDragLine);
        });
        div.appendChild(cp);
    });
}

function createTempArrow(x, y) {
    const tempArrow = document.createElementNS("http://www.w3.org/2000/svg","line");
    tempArrow.setAttribute('x1', x);
    tempArrow.setAttribute('y1', y);
    tempArrow.setAttribute('x2', x);
    tempArrow.setAttribute('y2', y);
    tempArrow.setAttribute('stroke', "#39ff14");
    tempArrow.setAttribute('stroke-width', "3");
    tempArrow.setAttribute('marker-end','url(#arrowhead)');
    arrowsSVG.appendChild(tempArrow);
    return tempArrow;
}

function onDragLine(e) {
    if (!connectionDrag.active) return;
    const rect = canvas.getBoundingClientRect();
    const fromRect = connectionDrag.fromBlock.getBoundingClientRect();
    let x1, y1;
    switch(connectionDrag.fromDir) {
        case 'top':
            x1 = fromRect.left + fromRect.width/2 - rect.left;
            y1 = fromRect.top - rect.top;
            break;
        case 'right':
            x1 = fromRect.right - rect.left;
            y1 = fromRect.top + fromRect.height/2 - rect.top;
            break;
        case 'bottom':
            x1 = fromRect.left + fromRect.width/2 - rect.left;
            y1 = fromRect.bottom - rect.top;
            break;
        case 'left':
            x1 = fromRect.left - rect.left;
            y1 = fromRect.top + fromRect.height/2 - rect.top;
            break;
    }
    connectionDrag.line.setAttribute('x1', x1);
    connectionDrag.line.setAttribute('y1', y1);
    connectionDrag.line.setAttribute('x2', e.pageX - rect.left);
    connectionDrag.line.setAttribute('y2', e.pageY - rect.top);
}

function onStopDragLine(e) {
    document.removeEventListener('mousemove', onDragLine);
    document.removeEventListener('mouseup', onStopDragLine);

    if (connectionDrag.active) {
        const rect = canvas.getBoundingClientRect();
        let toBlock = null;
        for (let block of blocks) {
            const bRect = block.getBoundingClientRect();
            if (
                e.pageX >= bRect.left &&
                e.pageX <= bRect.right &&
                e.pageY >= bRect.top &&
                e.pageY <= bRect.bottom
            ) {
                toBlock = block;
                break;
            }
        }
        if (toBlock && toBlock !== connectionDrag.fromBlock) {
            if (!arrows.some(a => a.from === connectionDrag.fromBlock && a.to === toBlock)) {
                arrows.push({from: connectionDrag.fromBlock, to: toBlock});
            }
        }
        arrowsSVG.removeChild(connectionDrag.line);
        connectionDrag.active = false;
        connectionDrag.fromBlock = null;
        connectionDrag.line = null;
        updateArrows();
    }
}

function updateArrows() {
    arrowsSVG.innerHTML = `<defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
        <polygon points="0 0, 8 3.5, 0 7" fill="#222"/>
    </marker>
</defs>`;
    arrows.forEach((arrowObj, idx) => {
        const {from, to} = arrowObj;
        const rect1 = from.getBoundingClientRect();
        const rect2 = to.getBoundingClientRect();
        const cRect = canvas.getBoundingClientRect();
        const x1 = rect1.left - cRect.left + rect1.width/2;
        const y1 = rect1.top - cRect.top + rect1.height/2;
        const x2 = rect2.left - cRect.left + rect2.width/2;
        const y2 = rect2.top - cRect.top + rect2.height/2;
        const arrow = document.createElementNS("http://www.w3.org/2000/svg","line");
        arrow.setAttribute('x1', x1);
        arrow.setAttribute('y1', y1);
        arrow.setAttribute('x2', x2);
        arrow.setAttribute('y2', y2);
        arrow.setAttribute('stroke', (idx === selectedArrowIndex) ? "#ff3a3a" : "#222");
        arrow.setAttribute('stroke-width', "3");
        arrow.setAttribute('marker-end','url(#arrowhead)');
        arrow.style.cursor = 'pointer';
        arrow.addEventListener('click', function(evt) {
            evt.stopPropagation();
            selectedArrowIndex = idx;
            updateArrows();
            showDeleteArrowBtn();
        });
        arrowsSVG.appendChild(arrow);
    });
    if (selectedArrowIndex === null) hideDeleteArrowBtn();
}

function showDeleteArrowBtn() { deleteArrowBtn.style.display = "block"; }
function hideDeleteArrowBtn() { deleteArrowBtn.style.display = "none"; }

function deleteSelectedArrow() {
    if (selectedArrowIndex !== null) {
        arrows.splice(selectedArrowIndex,1);
        selectedArrowIndex = null;
        updateArrows();
    }
}

document.body.addEventListener('click', function() {
    if (selectedArrowIndex !== null) {
        selectedArrowIndex = null;
        updateArrows();
    }
});

function getBlockCodeLabel(type) {
    switch(type){
        case 'startend': return 'start';
        case 'io': return 'io';
        case 'process': return 'process';
        case 'decision': return 'decision';
        default: return 'step';
    }
}

function generateCode() {
    let start = blocks.find(b => b.getAttribute('data-type') === 'startend');
    if (!start) {
        document.getElementById('code').value = 'ERROR: No Start block found!';
        return;
    }
    let code = '';
    let visited = new Set();

    function followPath(block) {
        if (!block || visited.has(block)) return;
        visited.add(block);

        let type = block.getAttribute('data-type');
        let label = getBlockCodeLabel(type);
        let input = block.querySelector('.block-input');
        let text = input ? input.value : '';
        code += `${label}: ${text}\n`;

        let outs = arrows.filter(a => a.from === block);
        if (outs.length > 0) {
            followPath(outs[0].to);
        }
    }
    followPath(start);
    document.getElementById('code').value = code.trim();
}

arrowsSVG.innerHTML = `<defs>
  <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
    <polygon points="0 0, 8 3.5, 0 7" fill="#222"/>
  </marker>
</defs>`;
