declare module "react-grid-layout" {
  import * as React from "react";

  export interface LayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
  }

  export type Layout = LayoutItem[];

  export interface ReactGridLayoutProps {
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    autoSize?: boolean;
    cols?: number;
    draggableCancel?: string;
    draggableHandle?: string;
    compactType?: "vertical" | "horizontal" | null;
    layout?: Layout;
    margin?: [number, number];
    containerPadding?: [number, number];
    rowHeight?: number;
    maxRows?: number;
    isBounded?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    isDroppable?: boolean;
    preventCollision?: boolean;
    useCSSTransforms?: boolean;
    transformScale?: number;
    resizeHandles?: Array<"s" | "w" | "e" | "n" | "sw" | "nw" | "se" | "ne">;
    onLayoutChange?: (layout: Layout) => void;
    onDragStart?: (layout: Layout, oldItem: LayoutItem, newItem: LayoutItem, placeholder: LayoutItem, event: MouseEvent, element: HTMLElement) => void;
    onDrag?: (layout: Layout, oldItem: LayoutItem, newItem: LayoutItem, placeholder: LayoutItem, event: MouseEvent, element: HTMLElement) => void;
    onDragStop?: (layout: Layout, oldItem: LayoutItem, newItem: LayoutItem, placeholder: LayoutItem, event: MouseEvent, element: HTMLElement) => void;
    onResizeStart?: (layout: Layout, oldItem: LayoutItem, newItem: LayoutItem, placeholder: LayoutItem, event: MouseEvent, element: HTMLElement) => void;
    onResize?: (layout: Layout, oldItem: LayoutItem, newItem: LayoutItem, placeholder: LayoutItem, event: MouseEvent, element: HTMLElement) => void;
    onResizeStop?: (layout: Layout, oldItem: LayoutItem, newItem: LayoutItem, placeholder: LayoutItem, event: MouseEvent, element: HTMLElement) => void;
    children?: React.ReactNode;
    innerRef?: React.Ref<HTMLDivElement>;
  }

  export default class ReactGridLayout extends React.Component<ReactGridLayoutProps> {}
}

declare module "react-grid-layout/css/styles.css" {
  const content: string;
  export default content;
}
