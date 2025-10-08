// VirtualList.js - Efficient list rendering for large datasets
class VirtualList {
    constructor(container, itemHeight, renderItem) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.items = [];
        this.visibleStart = 0;
        this.visibleCount = Math.ceil(282 / itemHeight) + 2; // Screen height + buffer
        this.selectedIndex = 0;

        this._setupScrollListener();
    }

    setItems(items) {
        this.items = items;
        this.selectedIndex = 0;
        this.visibleStart = 0;
        this.render();
    }

    setSelectedIndex(index) {
        this.selectedIndex = Math.max(0, Math.min(index, this.items.length - 1));
        this._ensureVisible(this.selectedIndex);
        this.render();
    }

    getSelectedItem() {
        return this.items[this.selectedIndex];
    }

    render() {
        const totalHeight = this.items.length * this.itemHeight;
        const visibleItems = this.items.slice(
            this.visibleStart,
            this.visibleStart + this.visibleCount
        );

        this.container.innerHTML = `
            <div class="virtual-list-content" style="height: ${totalHeight}px; position: relative;">
                <div class="virtual-list-items" style="position: absolute; top: ${this.visibleStart * this.itemHeight}px; width: 100%;">
                    ${visibleItems.map((item, localIndex) => {
                        const globalIndex = this.visibleStart + localIndex;
                        const isSelected = globalIndex === this.selectedIndex;
                        return this.renderItem(item, isSelected, globalIndex);
                    }).join('')}
                </div>
            </div>
        `;
    }

    _setupScrollListener() {
        this.container.addEventListener('scroll', () => {
            const scrollTop = this.container.scrollTop;
            const newStart = Math.floor(scrollTop / this.itemHeight);

            if (newStart !== this.visibleStart) {
                this.visibleStart = newStart;
                this.render();
            }
        });
    }

    _ensureVisible(index) {
        const itemTop = index * this.itemHeight;
        const itemBottom = itemTop + this.itemHeight;
        const scrollTop = this.container.scrollTop;
        const scrollBottom = scrollTop + this.container.clientHeight;

        if (itemTop < scrollTop) {
            this.container.scrollTop = itemTop;
        } else if (itemBottom > scrollBottom) {
            this.container.scrollTop = itemBottom - this.container.clientHeight;
        }
    }
}
