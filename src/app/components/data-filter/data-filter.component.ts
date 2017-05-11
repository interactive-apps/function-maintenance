import {Component, OnInit, AfterViewInit, Output, EventEmitter} from '@angular/core';
import {DataFilterService} from "../../services/data-filter.service";

export const DATA_OPTIONS = [
  {
    name: 'All',
    prefix: 'all',
    selected: true},
  {
    name: 'Data Elements',
    prefix: 'de',
    selected: false
  },
  {
    name: 'Computed Values',
    prefix: 'in',
    selected: false
  },
  {
    name: 'Entry Forms',
    prefix: 'cv',
    selected: false
  }
]
@Component({
  selector: 'app-data-filter',
  templateUrl: './data-filter.component.html',
  styleUrls: ['./data-filter.component.css']
})
export class DataFilterComponent implements OnInit, AfterViewInit {

  dataOptions: any[] = DATA_OPTIONS;
  dataGroups: any[] = [];
  listItems:any[] = [];
  selectedItems:any[] = [];
  querystring: string = null;
  listchanges: string = null;
  showGroups:boolean = false;
  showBody:boolean = false;
  selectedGroup:any;
  @Output() onDataUpdate: EventEmitter<any> = new EventEmitter<any>();
  constructor(
    private dataFilterService: DataFilterService
  ) { }

  ngOnInit() {
   this.getDataGroups(this.getDataGroupArray(this.dataOptions));
    this.getAllItems(null);
  }

  ngAfterViewInit() {
   this.getAllItems(null);
  }

  toggleDataOption(optionPrefix) {
    for(let option of this.dataOptions) {
      if(option.prefix == optionPrefix) {
        option.selected = !option.selected;
        break;
      }
    }

    //update data group
    this.getDataGroups(this.getDataGroupArray(this.dataOptions));
  }

  getList(){
    let list  = [];
    for( let item of this.dataGroups ){
      if (item['dataElementGroups']){
        for( let dataElement of item['dataElementGroups']){
          list.push(dataElement);
        }
      }if(item['indicatorGroups']){
        for( let dataElement of item['indicatorGroups']){
          list.push(dataElement);
        }
      }
    }
    return list;
  }

  getAllItems(default_list =null){
    if(default_list != null){
      this.listItems = default_list
    }else{
      let list  = [];
      for( let item of this.dataGroups ){
        if (item['dataElementGroups']){
          for( let dataElement of item['dataElementGroups']){
            for( let element of dataElement.dataElements){
              list.push(element);
            }
          }
        }if(item['indicatorGroups']){
          for( let dataElement of item['indicatorGroups']){
            for( let element of dataElement.indicators){
              list.push(element);
            }
          }
        }
      }
      this.listItems = list;
    }
    console.log("Length:",this.listItems.length);
    if(this.listItems.length > 0){
      this.addSelected(this.listItems[0]);
    }
  }

  getDataGroupArray(dataOptions: any[]) {
    let groupArray: any[] = [];

    for(let option of dataOptions) {
      if(option.selected) {
        if(option.prefix == 'all') {
          let allOptions: any[] = [];
          for(let optionValue of dataOptions) {
            if(optionValue.prefix != 'all') {
              allOptions.push(optionValue.prefix);
            }
          }
          groupArray = allOptions;
          break;
        } else {
          groupArray.push(option.prefix);
        }
      }
    }

    return groupArray;
  }

  getDataGroups(groupArray) {
    if(groupArray.length > 0) {
      this.dataFilterService.getDataGroups(groupArray)
        .subscribe(groups => {
          this.dataGroups = groups;
          console.log(groups);
          this.getAllItems();
        }, error => console.log(error))
    }
  }

  showItems(item){
    this.selectedGroup = item;
    if(item.hasOwnProperty("dataElements")){
      this.listItems = item.dataElements;
    }if(item.hasOwnProperty("indicators")){
      this.listItems = item.indicators;
    }
    this.showGroups = false;
  }

  selectedNames=[];
  addSelected(item){
    console.log("Selected:",this.selectedItems);
    this.selectedItems.push(item);
    this.selectedNames.push(item.name);
    this.getSelectedPeriods();
    this.onDataUpdate.emit({
        selectedData: {name: 'dx', names:this.selectedNames,value: this.getDataForAnalytics(this.selectedItems)},
        hideQuarter:this.hideQuarter,
        hideMonth:this.hideMonth
      });
  }

  removeSelected(item){
    this.selectedItems.splice(this.selectedItems.indexOf(item),1);
    this.selectedNames.splice(this.selectedNames.indexOf(item),1);
    this.getSelectedPeriods();
    this.onDataUpdate.emit({
      selectedData: {name: 'dx', names:this.selectedNames, value: this.getDataForAnalytics(this.selectedItems)},
      hideQuarter:this.hideQuarter,
      hideMonth:this.hideMonth
    });
  }

  inSelected(item){
    return this.selectedItems.indexOf(item) != -1;
  }

  transferDataSuccess(data,current){
    if(data.dragData.id == current.id){
      console.log("Droping in the same area")
    }else{
      let number = (this.getDataPosition(data.dragData.id) > this.getDataPosition(current.id))?0:1;
      this.deleteData( data.dragData );
      this.insertData( data.dragData, current, number);
    }
  }

  // helper method to find the index of dragged item
  getDataPosition(Data_id){
    let Data_index = null;
    this.selectedItems.forEach((Data, index) => {
      if(Data.id == Data_id){
        Data_index = index;
      }
    });
    return Data_index;
  }

  // help method to delete the selected Data in list before inserting it in another position
  deleteData( Data_to_delete ){
    this.selectedItems.forEach((Data, Data_index) => {
      if( Data_to_delete.id == Data.id){
        this.selectedItems.splice(Data_index,1);
      }
    });
  }

  // Helper method to insert Data in new position after drag drop event
  insertData( Data_to_insert, current_Data, num:number ){
    this.selectedItems.forEach((Data, Data_index) => {
      if( current_Data.id == Data.id && !this.checkDataAvailabilty(Data_to_insert,this.selectedItems) ){
        this.selectedItems.splice(Data_index+num,0,Data_to_insert);
      }
    });
  }

  // check if orgunit already exist in the orgunit display list
  checkDataAvailabilty(Data, array): boolean{
    let checker = false;
    for( let per of array ){
      if( per.id == Data.id){
        checker =true;
      }
    }
    return checker;
  }

  hideMonth:boolean = false;
  hideQuarter:boolean = false;
  getSelectedPeriods(){
    let periods = [];
    for (let data_item of this.selectedItems ){
      if(data_item.hasOwnProperty("dataSets")){
        for( let dataset of data_item.dataSets ){
          console.log(dataset)
          if(periods.indexOf(dataset.periodType) == -1){
            periods.push(dataset.periodType)
          }
        }
      }
      if(data_item.hasOwnProperty("dataSetElements")){
        for( let dataset of data_item.dataSetElements ){
          if(periods.indexOf(dataset.dataSet.periodType) == -1){
            periods.push(dataset.dataSet.periodType)
          }
        }

      }
    }
    if(this.selectedItems.length > 0){
      if(periods.indexOf("Monthly") == -1 && (periods.indexOf("Quarterly") != -1  || periods.indexOf("FinancialJuly") != -1 )){
        this.hideMonth = true;
      }else{
        this.hideMonth = false;
      }
      if(periods.indexOf("Monthly") == -1 && periods.indexOf("Quarterly") == -1 && periods.indexOf("FinancialJuly") != -1){
        this.hideMonth = true;
        this.hideQuarter = true;
      }else{
        this.hideQuarter = false;
      }
      if(periods.indexOf("Quarterly") != -1){
        this.hideQuarter = false;
      }

    }
  }

  getDataForAnalytics(selectedData) {
    let dataForAnalytics = "";
    selectedData.forEach((dataValue, dataIndex) => {
      dataForAnalytics += dataIndex == 0 ? dataValue.id : ';' + dataValue.id;
    });
    return dataForAnalytics;
  }
}
