import React, { Component } from 'react';
import ConnectivityDeck from "./ConnectivityDeck";
import { withStyles } from '@material-ui/core';
import Toolbar from '@material-ui/core/Toolbar';
import MenuButton from "./MenuButton";
import IconButtonWithTooltip from "../../../utilities/IconButtonWithTooltip";
import { faList, faSort } from "@fortawesome/free-solid-svg-icons";


const styles = {

  toolbar: {
    padding: "0",
    marginLeft:"5px"
  },
  toolbarBox: { backgroundColor: "rgb(0,0,0,0.5);", },
  button: {
    padding: "8px",
    top: "0",
    color: "#fc6320"
  },

};

class ConnectivityToolbar extends Component {
  constructor (props) {
    super(props);
  }

  /**
   *
   * Updates buttonVisibility true
   *
   * @command onHover (layout)
   *
   */

  render () {
    const {
      id, classes, layout, toolbarVisibility,
      deckHandler, legendHandler, sortOptionsHandler 
    } = this.props;

    const visibility = toolbarVisibility ? "visible" : "hidden";
    const legendsTooltip = "Toggle legend";
    const sortOptions = {
      'id': 'By entity name',
      'pre_count': 'By # pre',
      'post_count': 'By # post'
    };
    let selectButton;
    let toggleButton;
    if (layout.hasSelect()){
      selectButton = (<MenuButton id={id + 'select'}
        options={sortOptions}
        handler = {sortOptionsHandler}
        defaultOption = "id"
        tooltip={"Order by"}
        icon={faSort}
      />);
    }
    if (layout.hasToggle()){
      toggleButton = (<IconButtonWithTooltip
        disabled={false}
        onClick={() => legendHandler()}
        className={classes.button}
        tooltip={legendsTooltip}
        icon={faList}
      />);
    }


    return (
      <Toolbar className={classes.toolbar}>
        <div className={classes.toolbarBox + " visibility: " + visibility }>
          <ConnectivityDeck ref={ deck => {
            this.deck = deck
          } } handler={deckHandler}/>
          {selectButton}
          {toggleButton}
        </div>
      </Toolbar>
    )
  }
}
export default withStyles(styles)(ConnectivityToolbar);