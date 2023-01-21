import setViews from "../../config/setViews"
import setSidebarDatepicker from "../menus/sidebarDatepicker"
import fullFormConfig from "../forms/formUtils"
import FormSetup from "../forms/setForm";
import getEntryOptionModal from "../menus/entryOptions";
import { Week } from "../../factory/entries"
import locales from "../../locales/en"
import calcTime, { formatTime } from "../../utilities/timeutils"

import {
  createCloseIcon,
  createMeatballVertIcon
} from "../../utilities/svgs"

import {
  formatStartEndDate,
  getTempDates,
  getFormDateObject,
  getDateFromAttribute,
} from "../../utilities/dateutils"

import handleOverlap, {
  setStylingForEvent,
  updateBoxCoordinates,
  setBoxTimeAttributes,
  createBox,
  createTemporaryBox,
  getBoxDefaultStyle,
  resetStyleOnClick,
  createTempBoxHeader,
  startEndDefault,
  getOriginalBoxObject,
  resetOriginalBox,
} from "../../utilities/dragutils"

import { getClosest, placePopup } from "../../utilities/helpers"

import createToast from "../toastPopups/toast"

import {
  toastNoCategorySelected,
  removeToastNoCategorySelected,
} from "../toastPopups/toastCallbacks"

// main app sidebar
const sidebar = document.querySelector('.sidebar');
// calendar overlay
const resizeoverlay = document.querySelector(".resize-overlay")
// weekview main grid wrapper & children
const main = document.querySelector(".weekview")
const container = document.querySelector(".weekview--calendar")
const weekviewHeader = document.querySelector(".weekview--header")
const weekviewHeaderDayNumber = document.querySelectorAll(".weekview--header-day__number")
const weekviewHeaderDay = document.querySelectorAll(".weekview--header-day")
const weekviewGrid = document.querySelector(".weekview__grid")
const cols = document.querySelectorAll(".week--col")
// weekview top grid & children
const alldaymodule = document.querySelector(".weekview--allday-module")
const topCols = document.querySelectorAll(".allday--col")
export default function setWeekView(context, store, datepickerContext) {
  const weekArray = context.getWeekArray()
  let entries = store.getWeekEntries(weekArray)
  let boxes = new Week(entries.day, entries.allDay);

  function setDayView(e) {
    let [yr, mo, da] = getDateFromAttribute(e.target, "data-weekview-date")
    context.setDate(yr, mo, da)
    context.setDateSelected(da)
    context.setComponent("day")
    setViews("day", context, store, datepickerContext)
  }

  function configureDaysOfWeek() {
    document.querySelector(".wv-gmt").textContent = `UTC ${context.getGmt()}`
    let hasToday;
    let hasSelected;
    let dayNumbers = []
    let ymd = []
    const today = context.getToday()
    let [ty, tm, td] = [today.getFullYear(), today.getMonth(), today.getDate()]

    weekArray.forEach((day, idx) => {
      let [y, m, d] = [
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
      ];

      dayNumbers.push(d);
      ymd.push(`${y}-${m}-${d}`)

      if (d === context.getDateSelected() && m === context.getMonth()) {
        hasSelected = d;
      }

      if (d === td && m === tm && y === ty) {
        hasToday = d;
      }
    })

    dayNumbers.forEach((num, idx) => {
      if (num === hasSelected) {
        weekviewHeaderDayNumber[idx].classList.add("wvh--selected")
      } else {
        weekviewHeaderDayNumber[idx].classList.remove("wvh--selected")
      }

      if (num === hasToday) {
        weekviewHeaderDayNumber[idx].classList.add("wvh--today")
      } else {
        weekviewHeaderDayNumber[idx].classList.remove("wvh--today")
      }
      
      weekviewHeaderDayNumber[idx].textContent = num
      weekviewHeaderDayNumber[idx].setAttribute("data-weekview-date", ymd[idx]);
      topCols[idx].setAttribute("data-wvtop-day", num)
    })

    // weekviewHeader.onmousedown = setDayView
  }

  function renderSidebarDatepickerWeek() {
    if (!sidebar.classList.contains("hide-sidebar")) {
      datepickerContext.setDate(context.getYear(), context.getMonth(), context.getDay())
      setSidebarDatepicker(context, store, datepickerContext)
    }
  }

  function resetWeekviewBoxes() {
    cols.forEach(col => { col.innerText = "" })
    topCols.forEach(col => { col.innerText = "" })
  }

  function renderBoxes() {
    resetWeekviewBoxes()

    boxes.getBoxes().forEach((entry) => {
      const col = cols[+entry.coordinates.x];
      createBox(col, entry, "week", store.getCtgColor(entry.category))
    })

    const boxt = boxes.getBoxesTopLengths()
    for (const k in boxt) {
      const col = topCols[+k]
      createBoxesTop(col, boxt[k])
    }
  }

  function createBoxesTop(col, len) {
    const cell = document.createElement("div")
    cell.classList.add("allday__cell");
    cell.classList.add("allday__cell--active");

    const taskicons = document.createElement("div");
    taskicons.classList.add("wv-ad--taskicons");

    const icon = document.createElement("div");
    icon.classList.add("wv-ad--taskicon");
    icon.style.backgroundColor = "#6F0C2B";
    taskicons.appendChild(icon);

    const celltitle = document.createElement("div");
    celltitle.classList.add("wv-ad--celltitle");
    celltitle.textContent = `${len} more`;
    cell.append(taskicons, celltitle);
    col.appendChild(cell);
  }

  function createAllDayModalCell(entry, idx, col, handleCloseCallback) {
    const cell = document.createElement("div")
    cell.classList.add("allday-modal__cell")
    cell.setAttribute("data-allday-modal-cell", idx)
    cell.setAttribute("data-allday-modal-cell-id", entry.id)
    cell.style.backgroundColor = store.getCtgColor(entry.category)

    const cellcontent = document.createElement("div")
    cellcontent.classList.add("allday-modal__cell-content")

    const cellIcons = document.createElement("div")
    cellIcons.classList.add("allday-modal__cell-action-icons")

    const celltitle = document.createElement("div")
    celltitle.classList.add("allday-modal__celltitle")
    celltitle.textContent = entry.title;

    const cellendDate = document.createElement("div")
    cellendDate.classList.add("allday-modal__cellend-date")
    cellendDate.textContent = formatStartEndDate(
      new Date(entry.start), new Date(entry.end)
    );

    const cellcategoryTitle = document.createElement("div")
    cellcategoryTitle.classList.add("allday-modal__cellcategory-title")
    cellcategoryTitle.textContent = "category: " + entry.category;

    const getContextMenuViaMeatball = (e) => {
      getWeekViewContextMenu(col, entry, handleCloseCallback, e);
    }

    cellcontent.append(celltitle, cellcategoryTitle, cellendDate);
    cellIcons.appendChild(createMeatballVertIcon("var(--white4"));
    cell.append(cellcontent, cellIcons);
    cellIcons.onclick = getContextMenuViaMeatball;
    return cell;
  }

  function createAllDayModal(e, col, entries, idx, cell) {
    let dayofweek = locales.labels.weekdaysLong[idx]
    let daynumber = col.getAttribute("data-wvtop-day")
    const modal = document.createElement("div")
    modal.classList.add("allday-modal")

    let x;
    const colLeft = col.offsetLeft;
    if (colLeft + 240 + 32 > window.innerWidth) {
      x = window.innerWidth - 268;
    } else {
      x = colLeft + 32;
    }
    if (idx < 3) {
      modal.style.left = (col.offsetLeft + 32) + "px"
    } else {
      modal.style.left = (col.offsetLeft + 32) - 160 + "px"
    }
    modal.style.left = x + "px"
    modal.style.top = +weekviewGrid.offsetTop + "px"

    const modalheader = document.createElement("div")
    modalheader.classList.add("allday-modal__header")

    const modaltitle = document.createElement("div")
    modaltitle.classList.add("allday-modal-title")
    modaltitle.textContent = `${dayofweek} ${daynumber}, ${locales.labels.monthsLong[weekArray[idx].getMonth()]}`

    const closeAlldayModalBtn = document.createElement("div");
    closeAlldayModalBtn.classList.add("close-allday-modal");
    closeAlldayModalBtn.appendChild(createCloseIcon("var(--white4"));

    const modalcontent = document.createElement("div")
    modalcontent.classList.add("allday-modal__content")


    const closealldayonEsc = (e) => {
      if (e.key === "Escape") {
        closealldaymodal()
      }
    }
    const closealldaymodal = () => {
      modal.remove()
      resizeoverlay.classList.add("hide-resize-overlay")
      cell.firstChild.firstChild.style.backgroundColor = "#6F0C2B"
      document.removeEventListener("keydown", closealldayonEsc)
      store.removeActiveOverlay("allday-modal")
      cell.classList.remove("allday-modal__cell--open")
    }

    entries.forEach((entry, idx) => {
      const cell = createAllDayModalCell(entry, idx, col, closealldaymodal)
      modalcontent.appendChild(cell)
    })

    modalheader.append(modaltitle, closeAlldayModalBtn)
    modal.append(modalheader, modalcontent)
    main.insertBefore(modal, document.querySelector(".weekview__top"))

    resizeoverlay.onclick = closealldaymodal
    closeAlldayModalBtn.onclick = closealldaymodal
    document.addEventListener("keydown", closealldayonEsc)
    store.addActiveOverlay("allday-modal")
  }

  function openAllDayModal(e, cell) {
    const col = cell.parentElement
    // console.log(cell)
    cell.classList.add("allday-modal__cell--open")
    cell.firstChild.firstChild.style.backgroundColor = "#01635b"
    const colidx = parseInt(col.getAttribute("data-allday-column"))
    let colentries = boxes.getBoxesByColumnTop(colidx)
    if (colentries.length > 0) {
      createAllDayModal(e, col, colentries, colidx, cell)
      resizeoverlay.classList.remove("hide-resize-overlay")
    }
  }

  function getcol(idx) {
    return document.querySelector(`[data-column-index="${idx}"]`)
  }

  function handleWeekviewFormClose() {
    document.querySelector(".temp-week-box")?.remove()
  }

  function openWeekviewForm(box, coords, category, dates, type) {
    store.setFormResetHandle("week", handleWeekviewFormClose);

    const openForm = store.getRenderFormCallback();
    const setup = new FormSetup();

    const [submitType, id, title, description] = type;
    setup.setSubmission(submitType, id, title, description);
    if (submitType === "create") { box.style.opacity = 0.9; }

    const [categoryName, color, offsetColor] = category;
    setup.setCategory(
      categoryName,
      color,
      offsetColor,
    );

    setup.setPosition(
      +coords.x,
      [+coords.x, 3],
      parseInt((coords.y * 12.5) - weekviewGrid.scrollTop)
    );

    const [start, end] = dates
    setup.setDates(getFormDateObject(start, end));

    openForm();
    fullFormConfig.setFormDatepickerDate(context, datepickerContext, start);
    fullFormConfig.getConfig(setup.getSetup());
  }

  // ***********************
  // CONTEXT MENU SETUP
  function getWeekViewContextMenu(cell, entry, handleCloseCallback, e) {
    const id = entry.id;
    const start = entry.start;
    const color = store.getCtgColor(entry.category);
    const col = +cell.getAttribute("data-box-col")
    const rect = cols[col].getBoundingClientRect()

    let [x, y] = placePopup(
      400,
      165,
      [parseInt(rect.left), e.clientY],
      [window.innerWidth, window.innerHeight]
    )

    store.setFormResetHandle("week", handleCloseCallback);
    const setup = new FormSetup();
    setup.setSubmission("edit", id, entry.title, entry.description);
    setup.setCategory(entry.category, color, color);
    setup.setPosition(x, [x, y], y);
    setup.setDates(getFormDateObject(start, entry.end));
    console.log(getFormDateObject(start, entry.end))
    fullFormConfig.setFormDatepickerDate(context, datepickerContext, start);

    const finishSetup = () => fullFormConfig.getConfig(setup.getSetup());

    getEntryOptionModal(context, store, entry, datepickerContext, finishSetup);

    const modal = document.querySelector(".entry__options")
    if (window.innerWidth > 580) {
      modal.style.top = y + "px";
      modal.style.left = x + "px";
    } else {
      modal.style.top = "64px";
    }
  }
  // ***********************

  /** DRAG NORTH, SOUTH, EAST, WEST */
  function dragEngineWeek(e, box) {
    setStylingForEvent("dragstart", main, store)
    const col = box.parentElement
    const originalColumn = col.getAttribute("data-column-index")
    let currentColumn = col.getAttribute("data-column-index")
    let boxhasOnTop = false;
    box.setAttribute("data-box-col", currentColumn)

    const startTop = +box.style.top.split("px")[0]
    const boxHeight = +box.style.height.split("px")[0]
    let startCursorY = e.pageY - weekviewGrid.offsetTop
    let tempstartY = e.pageY;
    let startCursorX = e.pageX;
    let [movedX, movedY] = [0, 0];
    let [sX, sY] = [0, 0];
    let hasStyles = false;

    /** DRAG NORTH SOUTH */
    const mousemove = (e) => {
      sX = Math.abs(e.clientX - startCursorX);
      sY = Math.abs(e.clientY - tempstartY);
      if (!hasStyles) {
        if (sX > 3 || sY > 3) {
          hasStyles = true;
          document.body.style.cursor = "move";
          if (box.classList.contains("box-ontop")) {
            boxhasOnTop = true;
            resetStyleOnClick("week", box);
          }
          box.classList.add("box-dragging")
          createTemporaryBox(box, col, boxhasOnTop, "week")
          sX = 0;
          sY = 0;
        }
      }

      const headerOffset = weekviewGrid.offsetTop
      const currentCursorY = e.pageY - headerOffset
      let newOffsetY = currentCursorY - startCursorY
      let newTop = Math.round((newOffsetY + startTop) / 12.5) * 12.5

      if (newTop < 0 || currentCursorY < 0) {
        newTop = 0
        return;
      } else if (newTop + boxHeight > 1188) {
        return;
      }

      box.style.top = `${newTop}px`
      /** DRAG EAST/WEST */
      const direction = e.pageX - startCursorX > 0 ? "right" : "left"
      const currentCursorX = e.pageX
      let newOffsetX = startCursorX - currentCursorX
      let leftColX;
      let rightColX;

      if (+currentColumn - 1 >= 0) {
        leftColX = parseInt(getcol(currentColumn - 1).getBoundingClientRect().right)
      } else {
        leftColX = null
      }

      if (+currentColumn + 1 < cols.length) {
        rightColX = parseInt(getcol(+currentColumn + 1).getBoundingClientRect().left)
      } else {
        rightColX = null;
      }

      if (direction === "right" && rightColX !== null) {
        if (e.pageX >= rightColX) {
          getcol(+currentColumn + 1).appendChild(box)
          startCursorX = e.pageX
          currentColumn = +currentColumn + 1
          box.setAttribute("data-box-col", +currentColumn)
        }
      }

      if (direction === "left" && leftColX !== null) {
        if (e.pageX <= leftColX) {
          getcol(+currentColumn - 1).appendChild(box)
          startCursorX = e.pageX
          currentColumn = +currentColumn - 1
          box.setAttribute("data-box-col", +currentColumn)
        }
      }

      movedY = newOffsetY
      movedX = newOffsetX
    }

    function mouseup() {
      const tempbox = document.querySelector(".temporary-box")
      box.classList.remove("box-dragging");
      if (boxhasOnTop) { box.classList.add("box-ontop") }

      if (tempbox === null) {
        // const reset
        const setResetWv = () => {
          setStylingForEvent("dragend", main, store)
          box.classList.remove("wv-box-clicked")
        }
        box.classList.add("wv-box-clicked")
        const id = box.getAttribute("data-box-id");
        const entry = store.getEntry(id);
        const start = entry.start;
        const color = box.style.backgroundColor;
        const rect = box.getBoundingClientRect()
        let [x, y] = placePopup(
          400,
          165,
          [parseInt(rect.left), parseInt(rect.top) + 32],
          [window.innerWidth, window.innerHeight],
          false,
        );
        store.setFormResetHandle("week", setResetWv)

        const setup = new FormSetup();
        setup.setSubmission("edit", id, entry.title, entry.description);
        setup.setCategory(entry.category, color, color);
        setup.setPosition(x, [x, y], y);
        setup.setDates(getFormDateObject(start, entry.end));
        fullFormConfig.setFormDatepickerDate(context, datepickerContext, start);

        const finishSetup = () => fullFormConfig.getConfig(setup.getSetup());
        getEntryOptionModal(context, store, entry, datepickerContext, finishSetup);

        const modal = document.querySelector(".entry__options")
        if (window.innerWidth > 580) {
          modal.style.top = +y + "px";
          modal.style.left = x + "px";
        } else {
          modal.style.top = "64px";
        }
        // resetOriginalBox(box, boxorig);
        // getWeekViewContextMenu(
        //   box,
        //   store.getEntry(box.getAttribute("data-box-id")),
        //   handleWeekviewFormClose,
        //   e
        // );

      } else {
        tempbox.remove();
        setBoxTimeAttributes(box, "week");
        const time = calcTime(
          +box.getAttribute("data-start-time"),
          +box.getAttribute("data-time-intervals")
        );

        box.setAttribute("data-time", time);
        box.children[1].children[0].textContent = time;

        updateBoxCoordinates(box, "week", boxes);
        boxes.updateStore(
          store,
          box.getAttribute("data-box-id"),
          weekArray
        );
        // if box is moved to a new column, update sidebar datepicker
        if (currentColumn !== +originalColumn) {
          renderSidebarDatepickerWeek()
        };
        // check if new position overlaps with other boxes and handle
        let droppedCol = +box.getAttribute("data-box-col");
        if (boxes.getBoxesByColumn(droppedCol).length > 1) {
          handleOverlap(droppedCol, "week", boxes)
        } else {
          box.setAttribute("box-idx", "box-one")
        }
        setStylingForEvent("dragend", main, store)
      }

      document.removeEventListener("mousemove", mousemove)
      document.removeEventListener("mouseup", mouseup)
    }
    document.addEventListener("mousemove", mousemove)
    document.addEventListener("mouseup", mouseup)
  }

  /** RESIZE NORTH/SOUTH 
   * resizing will never trigger form
  */
  function resizeBoxNS(e, box) {
    setStylingForEvent("dragstart", main, store);
    document.body.style.cursor = "move";

    const col = box.parentElement;
    const currentColumn = col.getAttribute("data-column-index");
    box.setAttribute("data-box-col", currentColumn);

    let boxhasOnTop = false;
    let boxorig = getOriginalBoxObject(box);
    if (box.classList.contains("box-ontop")) {
      boxhasOnTop = true;
      resetStyleOnClick("week", box);
    }

    box.classList.add("box-resizing")
    const boxTop = box.offsetTop;
    createTemporaryBox(box, col, boxhasOnTop, "week");

    const mousemove = (e) => {
      const headerOffset = weekviewGrid.offsetTop;
      let amountScrolled = Math.abs(parseInt(container.getBoundingClientRect().top));
      if (amountScrolled == headerOffset) {
        amountScrolled -= headerOffset;
      } else if (container.getBoundingClientRect().top > 0) {
        amountScrolled = headerOffset - amountScrolled;
      } else {
        amountScrolled += headerOffset;
      }



      // console.log(window.innerHeight, e.pageY)

      // if (window.innerHeight < e.pageY) {
      //   main.scrollBy(0, Math.abs(window.innerHeight - e.pageY));
      // }

      const newHeight = Math.round(((e.pageY - boxTop - headerOffset) + amountScrolled) / 12.5) * 12.5;

      if (newHeight <= 12.5) {
        box.style.height = '12.5px';
        return;
      } else if (newHeight + parseInt(box.style.top) > 1188) {
        return;
      } else {
        box.style.height = `${newHeight}px`;
      }
    }

    const mouseup = (e) => {
      document.querySelector(".temporary-box").remove();
      box.classList.remove("box-resizing");
      if (boxhasOnTop) { box.classList.add("box-ontop") }

      if (box.style.height === boxorig.height) {
        if (boxhasOnTop) {
          box.setAttribute("class", boxorig.class);
          box.style.left = boxorig.left;
          box.style.width = boxorig.width;
        }
      } else {
        setBoxTimeAttributes(box, "week");
        const start = +box.getAttribute("data-start-time");
        const length = +box.getAttribute("data-time-intervals");
        const time = calcTime(start, length);
        box.children[1].children[0].textContent = time;
        updateBoxCoordinates(box, "week", boxes);

        let droppedCol = +box.getAttribute("data-box-col");
        if (boxes.getBoxesByColumn(droppedCol).length > 1) {
          handleOverlap(droppedCol, "week", boxes);
        }

        boxes.updateStore(
          store,
          box.getAttribute("data-box-id"),
          weekArray,
        );
      }

      setStylingForEvent("dragend", main, store);
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("mouseup", mouseup);
    }
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  }

  /** Drag down empty column to create box */
  function createBoxOnDrag(e) {
    setStylingForEvent("dragstart", main, store);
    document.body.style.cursor = "move";
    const [tempcategory, color] = store.getFirstActiveCategoryKeyPair();
    const colIdx = parseInt(e.target.getAttribute("data-column-index"));

    const box = document.createElement('div');
    box.setAttribute("class", "box box-dragging temp-week-box");

    // boxheader is static - create from template
    const boxheader = createTempBoxHeader("week");
    const boxcontent = document.createElement('div');
    const boxtime = document.createElement('span');
    const boxtimeend = document.createElement('span');
    boxcontent.classList.add('box__content');
    boxtime.classList.add('box-time');
    boxtimeend.classList.add('box-time');


    const headerOffset = +weekviewGrid.offsetTop;
    const scrolled = parseInt(weekviewGrid.scrollTop);
    const startCursorY = e.pageY - weekviewGrid.offsetTop;

    let y = Math.round((startCursorY + Math.abs(scrolled)) / 12.5) * 12.5;
    box.setAttribute("style", getBoxDefaultStyle(y, color));

    let coords = { y: +y / 12.5, x: colIdx, h: 1, e: 2 }
    let [starthour, startmin, endhour, endmin] = startEndDefault(y);

    function mousemove(e) {
      const currentCursorY = e.pageY - headerOffset;
      let newOffsetY = currentCursorY - startCursorY;
      let newHeight = Math.round((newOffsetY) / 12.5) * 12.5;

      if (newHeight <= 12.5) { newHeight = 12.5 }
      if (newHeight + y > 1188) { newHeight = 1187.5 - y }
      box.style.height = `${newHeight}px`;

      coords.h = +newHeight / 12.5;
      coords.e = +coords.y + coords.h;

      endhour = Math.floor(((+newHeight + +y) / 12.5) / 4);
      endmin = Math.floor(((+newHeight + +y) / 12.5) % 4) * 15
      boxtime.style.wordBreak = "break-word";
      boxtime.textContent = `${formatTime(starthour, startmin)} – `;
      boxtimeend.textContent = `${formatTime(endhour, endmin)}`;
    }

    boxcontent.append(boxtime, boxtimeend);
    box.append(boxheader, boxcontent);
    e.target.appendChild(box);

    function mouseup() {
      const datesData = getTempDates(
        new Date(weekArray[colIdx]),
        [starthour, endhour],
        [startmin, endmin],
      );
      console.log(starthour, endhour)
      console.log(startmin, endmin)

      openWeekviewForm(
        box,
        coords,
        [tempcategory, color, color],
        datesData,
        ["create", null, null, null],
      );

      setStylingForEvent("dragend", main, store);
      document.removeEventListener("mouseup", mouseup);
      document.removeEventListener("mousemove", mousemove);
    }
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  }

  /** delegate via grid */
  function delegateGridEvents(e) {
    if (getClosest(e, ".weekview--header-day__number")) {
      setDayView(e)
      return;
    }
    
    if (getClosest(e, ".box-resize-s")) {
      resizeBoxNS(e, e.target.parentElement);
      return;
    }

    if (getClosest(e, ".box")) {
      dragEngineWeek(e, e.target);
      return;
    }

    if (getClosest(e, ".week--col")) {
      createBoxOnDrag(e, e.target);
      return;
    }
  }

  function delegateGridTop(e) {
    if (getClosest(e, ".allday--col")) {
      // console.log()
      if (e.target.childElementCount === 0) {
        return;
      }
      openAllDayModal(e, e.target);
      return;
    }
  }

  function renderDataForGrid() {
    renderBoxes();
    const colsToCheck = boxes.getColumnsWithMultipleBoxes();
    colsToCheck.forEach(col => handleOverlap(col, "week", boxes));
  }

  const initWeek = () => {
    configureDaysOfWeek();
    renderDataForGrid();
    store.setResetPreviousViewCallback(resetWeekviewBoxes)
    main.onmousedown = delegateGridEvents;
    alldaymodule.onmousedown = delegateGridTop;
  }
  initWeek();
}