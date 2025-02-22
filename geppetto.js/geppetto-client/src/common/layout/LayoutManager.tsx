import * as React from 'react';
import * as FlexLayout from '@metacell/geppetto-meta-ui/flex-layout/src/index';
import Actions from '@metacell/geppetto-meta-ui/flex-layout/src/model/Actions';
import DockLocation from '@metacell/geppetto-meta-ui/flex-layout/src/DockLocation';
import Model from '@metacell/geppetto-meta-ui/flex-layout/src/model/Model';
import { WidgetStatus, Widget, ComponentMap, TabsetPosition, IComponentConfig } from './model';
import { withStyles, createStyles } from '@material-ui/core/styles'
import WidgetFactory from "./WidgetFactory";
import TabsetIconFactory from "./TabsetIconFactory";
import defaultLayoutConfiguration from "./defaultLayout";
import { widget2Node, isEqual } from "./utils";
import * as GeppettoActions from '../actions';

import {
  layoutActions,
  removeWidgetFromStore,
  updateWidget,
  setLayout
} from "./actions";

import { MINIMIZED_PANEL } from '.';


const styles = (theme) => createStyles({
  container: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    position: 'relative'
  },
  spacer: { width: theme.spacing(1) },
  flexlayout: { flexGrow: 1, position: 'relative' }
});

let instance: LayoutManager = null;

/**
 * Wraps the FlexLayout component in order to allow a declarative specification (widgets).
 * of the layout and the components displayed.
 *
 * Handles layout state update and layout import and export.
 *
 * @memberof Control
 */
class LayoutManager {
  model: Model;
  widgetFactory: WidgetFactory;
  tabsetIconFactory: TabsetIconFactory;
  store;
  layoutManager = this;
  enableMinimize = false;

  /**
   * @constructor
   * @param model
   * @param widgetFactory
   * @param widgets
   * @param tabsetIconFactory
   * @param enableMinimize
   */
  constructor(
    model,
    componentMap: ComponentMap,
    tabsetIconFactory: TabsetIconFactory = null,
    enableMinimize = false
  ) {
    this.model = FlexLayout.Model.fromJson(
      model ? model : defaultLayoutConfiguration
    );

    this.widgetFactory = new WidgetFactory(componentMap);
    this.tabsetIconFactory = tabsetIconFactory
      ? tabsetIconFactory
      : new TabsetIconFactory();
    this.middleware = this.middleware.bind(this);
    this.factory = this.factory.bind(this);
    this.enableMinimize = enableMinimize;
  }

  /**
   * Adds a widget to the layout.
   *
   * @param {Widget} widgetConfiguration widget to add
   */
  addWidget(widgetConfiguration: Widget) {
    if (this.getWidget(widgetConfiguration.id) && this.model.getNodeById(widgetConfiguration.id)) {
      return this.updateWidget(widgetConfiguration);
    }
    const { model } = this;
    let tabset = model.getNodeById(widgetConfiguration.panelName);
    if (tabset === undefined) {
      this.createTabSet(widgetConfiguration.panelName, widgetConfiguration.defaultPosition, widgetConfiguration.defaultWeight);
    }
    this.model.doAction(
      Actions.addNode(
        widget2Node(widgetConfiguration),
        widgetConfiguration.panelName,
        DockLocation.CENTER,
        widgetConfiguration.pos ? widgetConfiguration.pos : -1
      )
    );
  }

  /**
   * Handle rendering of tab set.
   *
   * @param panel
   * @param renderValues
   * @param tabSetButtons
   */
  onRenderTabSet = (panel, renderValues, tabSetButtons) => {
    if (panel.getType() === 'tabset') {
      if (this.enableMinimize) {
        if (panel.getChildren().length > 0) {
          renderValues.buttons.push(
            <div
              key={panel.getId()}
              className="fa fa-window-minimize customIconFlexLayout"
              onClick={() => {
                this.minimizeWidget(panel.getActiveNode().getId());
              }}
            />
          );
        }
      }

      if (Array.isArray(tabSetButtons) && tabSetButtons.length > 0) {
        tabSetButtons.forEach(Button => {
          renderValues.stickyButtons.push(
            <Button key={panel.getId()} panel={panel} />
          );
        });
      }
    }
  };

  /**
   * Handle rendering of tab set.
   *
   * @param panel
   * @param renderValues
   * @param tabButtons
   */
  onRenderTab = (panel, renderValues, tabButtons) => {
    if (panel.getType() === 'tab') {
      if (Array.isArray(tabButtons) && tabButtons.length > 0) {
        tabButtons.forEach(Button => {
          renderValues.buttons.push(
            <Button key={panel.getId()} panel={panel} />
          );
        });
      }
    }
  };

  /**
   * Layout wrapper component
   *
   * @memberof Component
   *
   */
  Component = (layoutManager: LayoutManager, config?: IComponentConfig) => ({
    classes,
  }) => (
    <div className={classes.container}>
      <div className={classes.flexlayout}>
        <FlexLayout.Layout
          model={this.model}
          factory={this.factory}
          icons={config?.icons}
          // iconFactory={layoutManager.iconFactory.bind(this)}
          onAction={action => layoutManager.onAction(action)}
          onRenderTab={(node, renderValues) =>
            layoutManager.onRenderTab(node, renderValues, config?.tabButtons)
          }
          onRenderTabSet={(node, renderValues) => {
            layoutManager.onRenderTabSet(
              node,
              renderValues,
              config?.tabSetButtons
            );
          }}
        />
      </div>
    </div>
  );

  /**
   * Get the layout component.
   * @memberof Control
   */
  getComponent = (config?: IComponentConfig) => withStyles(styles)(this.Component(this, config));

  /**
   * Create a new tab set.
   *
   * @param {string} tabsetID the id of the tab set
   * @private
   */
  private createTabSet(tabsetID, position = TabsetPosition.RIGHT, weight = 50) {
    const { model } = this;
    const rootNode = model.getNodeById("root");

    const tabset = new FlexLayout.TabSetNode(model, { id: tabsetID });

    switch (position) {
      case TabsetPosition.RIGHT:
        rootNode.getChildren().forEach(node => node._setWeight(100 - weight));
        rootNode._addChild(tabset);
        break;
      case TabsetPosition.LEFT:
        rootNode.getChildren().forEach(node => node._setWeight(100 - weight));
        rootNode._addChild(tabset, 0);
        break;
      case TabsetPosition.BOTTOM:
      case TabsetPosition.TOP: {

        tabset._setWeight(80);
        let hrow = new FlexLayout.RowNode(model, {});
        hrow._setWeight(100);

        rootNode.getChildren().forEach(child => {
          if (child['getWeight']) {
            const newWeight = (child as FlexLayout.TabSetNode).getWeight() / 2;
            child._setWeight(newWeight);
            hrow._addChild(child);
          }
        });
        if (position === TabsetPosition.BOTTOM) {
          hrow._addChild(tabset)
        } else {
          hrow._addChild(tabset, 0);
        }

        rootNode._removeAll();
        rootNode._addChild(hrow, 0);
      }
    }
  }
  /**
   * Export a session.
   */
  exportSession(): { [id: string]: any } {
    const confs = {};
    const components = this.widgetFactory.getComponents();
    for (const wid in components) {
      confs[wid] = components[wid].exportSession();
    }
    return confs;
  }

  /**
   * Import a widget session.
   *
   * @param {string} widgetId id of widget
   * @param conf widget configuration
   */
  importWidgetSession(widgetId: string, conf: any) {
    const component = this.widgetFactory.getComponent(widgetId);
    if (component) {
      try {
        component.importSession(conf);
      } catch (e) {
        console.error('Error importing session for', widgetId, e)
      }
    } else {
      // The component may not be yet initialized when loading the session
      setTimeout(() => this.importWidgetSession(widgetId, conf), 100);
    }
  }

  /**
   * Import complete session.
   *
   * @param confs configuration map
   */
  importSession(confs: { [id: string]: any }): void {
    const imported = new Set();
    for (const wid in confs) {
      this.importWidgetSession(wid, confs[wid]);
      imported.add(wid);
    }

    // Some components may have a current status here but no state exported in the session file
    for (const wid in this.widgetFactory.getComponents()) {
      if (!imported.has(wid)) {
        this.importWidgetSession(wid, null);
      }
    }
  }

  /**
   * Layout manager Redux middleware.
   * Sets the layout from Redux actions.
   *
   * @memberof Control
   * @memberof Control
   */
  middleware = (store) => (next) => (action) => {
    this.store = store;
    this.widgetFactory.setStore(store)

    let nextAction = true;
    let nextSetLayout = true;

    switch (action.type) {
      case layoutActions.ADD_WIDGET: {
        this.addWidget(action.data);
        break;
      }
      case layoutActions.ADD_WIDGETS: {
        this.addWidgets(action.data);
        break;
      }
      case layoutActions.UPDATE_WIDGET: {
        this.updateWidget(action.data);
        break;
      }
      case layoutActions.DESTROY_WIDGET: {
        const widget = action.data;
        this.deleteWidget(widget);
        break;
      }
      case layoutActions.REMOVE_WIDGET: {
        break;
      }
      case layoutActions.ACTIVATE_WIDGET: {
        action.data.status = WidgetStatus.ACTIVE;
        const widget = this.getWidget(action.data.id)
        widget.status = WidgetStatus.ACTIVE;
        this.updateWidget(widget);
        break;
      }
      case layoutActions.SET_WIDGETS: {
        const newWidgets: Map<string, Widget> = action.data;
        for (let widget of this.getWidgets()) {
          if (!newWidgets[widget.id]) {
            this.deleteWidget(widget);
          }
        }
        this.addWidgets(Object.values(newWidgets));
        break;
      }
      case layoutActions.SET_LAYOUT: {
        if (!isEqual(this.model.toJson(), action.data)) {
          this.model = FlexLayout.Model.fromJson(action.data);
        }
        break;
      }
      case GeppettoActions.IMPORT_APPLICATION_STATE: {
        const incomingState = action.data.redux.layout;
        this.model = FlexLayout.Model.fromJson(incomingState);
        this.importSession(action.data.sessions);

        nextSetLayout = false;
      }
      default: {
        nextSetLayout = false;
      }
    }

    if (nextAction) {
      next(action);
    }
    if (nextSetLayout) {
      next(setLayout(this.model.toJson()));
    }

  };

  /**
   * Add a list of widgets.
   *
   * @param {Array<Widget>} newWidgets list of widgets
   * @private
   */
  private addWidgets(newWidgets: Array<Widget>) {
    let actives = [];
    for (let widget of newWidgets) {
      if (widget.status == WidgetStatus.ACTIVE) {
        actives.push(widget.id);
      }
      this.addWidget(widget);
    }

    for (const active of actives) {
      this.model.doAction(FlexLayout.Actions.selectTab(active));
    }
  }

  /**
   * Delete a widget.
   *
   * @param widget
   * @private
   */
  private deleteWidget(widget: any) {
    this.model.doAction(Actions.deleteTab(widget.id));
  }

  /**
   * Return widgets.
   *
   * @private
   */
  private getWidgets(): Widget[] {
    return Object.values(this.store.getState().widgets)
  }

  /**
   * Handles state update related to actions in the flex layout
   * (e.g. select or move tab)
   *
   * @memberof Control
   * @param action
   */
  onAction(action) {
    const oldModel = this.model.toJson();
    let defaultAction = true;
    switch (action.type) {
      case Actions.SET_ACTIVE_TABSET:
        break;
      case Actions.SELECT_TAB:
        this.store.dispatch(updateWidget({ ...this.getWidget(action.data.tabNode), status: WidgetStatus.ACTIVE }))
        break;
      case Actions.DELETE_TAB: {
        if (this.getWidget(action.data.node).hideOnClose) {
          // widget only minimized, won't be removed from layout nor widgets list
          this.minimizeWidget(action.data.node);
          defaultAction = false;
        } else {
          // remove widget from widgets list
          this.store.dispatch(removeWidgetFromStore(action.data.node))
        }
        break;
      }
      case Actions.MAXIMIZE_TOGGLE:
	// reminder, widgets are not maximised but tabsets are
        break;
      case Actions.RENAME_TAB:
        this.store.dispatch(updateWidget({ ...this.getWidget(action.data.node), name: action.data.text }))
        break;
      case Actions.ADJUST_SPLIT:
        break;
      case Actions.ADD_NODE: {
        break;
      }
      case Actions.MOVE_NODE: {
        break;
      }
      default: {
        this.model.doAction(action);
      }
    }
    if (defaultAction) {
      this.model.doAction(action);
    }

    const newModel = this.model.toJson();
    if (!isEqual(oldModel, newModel)) {
      this.store.dispatch(setLayout(newModel));
    }
  }

  /**
   * Return the id of a tabset based on passed action.
   *
   * @param action
   * @private
   */
  private getTabsetId(action) {
    const widgetId = action.data.fromNode;
    return this.model
      .getNodeById(widgetId)
      .getParent()
      .getId();
  }

  /**
   * Find a maximized widget.
   *
   * @private
   */
  private findMaximizedWidget() {
    return this.getWidgets().find(
      (widget) => widget && widget.status == WidgetStatus.MAXIMIZED
    );
  }

  /**
   * Get specific widget.
   *
   * @param id
   * @private
   */
  private getWidget(id): Widget {
    return this.store.getState().widgets[id]
  }

  /**
   * Update maximized widget based on action.
   *
   * @param action
   * @private
   */
  private updateMaximizedWidget(action) {
    const { model } = this;
    const maximizedWidget = this.findMaximizedWidget();
    // check if the current maximized widget is the same than in the action dispatched
    if (maximizedWidget && maximizedWidget.id == action.data.node) {
      // find if there exists another widget in the maximized panel that could take its place
      const panelChildren = model.getActiveTabset().getChildren();
      const index = panelChildren.findIndex(
        (child) => child.getId() == action.data.node
      );
    }
  }

  /**
   * Minimize a widget.
   *
   * @param widgetId
   * @private
   */
  private minimizeWidget(widgetId) {
    var updatedWidget = { ...this.getWidget(widgetId) };
    if (updatedWidget === undefined) {
      return;
    }
    updatedWidget.status = WidgetStatus.MINIMIZED;
    updatedWidget.defaultPanel = updatedWidget.panelName;
    updatedWidget.panelName = MINIMIZED_PANEL;
    this.store.dispatch(updateWidget(updatedWidget))
  }

  /**
   * Update a widget.
   *
   * @param widget
   * @private
   */
  private updateWidget(widget: Widget) {
    const { model } = this;
    const previousWidget = this.getWidget(widget.id);
    const mergedWidget = { ...previousWidget, ...widget }
    // TODO: what if widget doesn't have a status here?

    if (previousWidget.status != mergedWidget.status) {
      if (previousWidget.status == WidgetStatus.MINIMIZED) {
        this.restoreWidget(mergedWidget);
      } else {
        this.moveWidget(mergedWidget);
      }
    }

    this.widgetFactory.updateWidget(mergedWidget);

    if (this.model.getNodeById(widget.id)) {
      model.doAction(Actions.updateNodeAttributes(mergedWidget.id, widget2Node(mergedWidget)));
      if (mergedWidget.status == WidgetStatus.ACTIVE) {
        model.doAction(FlexLayout.Actions.selectTab(mergedWidget.id));
      }
    }
  }

  /**
   * Create widget for node.
   *
   * @param node
   */
  factory(node) {
    return this.widgetFactory.factory(node.getConfig());
  }

  /**
   * Create icon for node.
   *
   * @param node
   */
  iconFactory(node) {
    // TODO move to newest flexlayout-react to add this functionality when needed
    return this.tabsetIconFactory.factory(node.getConfig());
  }

  /**
   * Restore widget.
   *
   * @param widget
   * @private
   */
  private restoreWidget(widget: Widget) {
    const { model } = this;
    widget.panelName = widget.defaultPanel;
    const panelName = widget.panelName;
    let tabset = model.getNodeById(panelName);
    if (tabset === undefined) {
      this.createTabSet(panelName, widget.defaultPosition, widget.defaultWeight);
    }
    this.moveWidget(widget);
  }

  private moveWidget(widget) {
    const { model } = this;
    model.doAction(
      FlexLayout.Actions.moveNode(
        widget.id,
        widget.panelName,
        FlexLayout.DockLocation.CENTER,
        widget.pos
      )
    );
  }
}

export function initLayoutManager(model, componentMap: ComponentMap, iconFactory: TabsetIconFactory) {
  instance = new LayoutManager(model, componentMap, iconFactory);
  return instance;
}

export const getLayoutManagerInstance = () => instance;
