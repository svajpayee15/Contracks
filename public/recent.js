const contentArea = document.getElementById('contentArea');
const gridBtn = document.getElementById('gridBtn');
const listBtn = document.getElementById('listBtn');

function setParams(viewType) {
    if (viewType === 'list') {
        // 1. Change Container Layout
        contentArea.classList.add('list-view');
        contentArea.classList.remove('grid-view');

        // 2. Update Buttons
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
    } else {
        // 1. Change Container Layout
        contentArea.classList.add('grid-view');
        contentArea.classList.remove('list-view');

        // 2. Update Buttons
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
    }
}