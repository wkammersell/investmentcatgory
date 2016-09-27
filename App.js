Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    
    launch: function() {
		// Delete any existing UI components
		if( this.down( 'rallychart' ) ) {
			this.down( 'rallychart' ).destroy();
        }
        if( this.down( 'label' ) ) {
			this.down( 'label' ).destroy();
        }
        
        // Show loading message
        this._myMask = new Ext.LoadMask(Ext.getBody(), {msg:"Calculating... Please wait."});
        this._myMask.show();
    
        // Look for features that are within the release
        var filters = [];
        filters.push( Ext.create( 'Rally.data.wsapi.Filter',
        	{
        		property: 'PercentDoneByStoryCount',
        		operator: '>',
        		value: 0
        	}
        ) );
        filters.push( Ext.create( 'Rally.data.wsapi.Filter',
        	{
        		property: 'PercentDoneByStoryCount',
        		operator: '<',
        		value: 1
        	}
        ) );

		var dataScope = this.getContext().getDataContext();
		var store = Ext.create(
			'Rally.data.wsapi.Store',
			{
				model: 'PortfolioItem/Feature ',
				fetch: ['ObjectID','Name','LeafStoryPlanEstimateTotal','InvestmentCategory','PercentDoneByStoryCount'],
				context: dataScope,
				pageSize: 2000,
				limit: 2000
			},
			this
        );

        var investmentCategories = {};
        store.addFilter( filters, false );
        store.loadPage(1, {
            scope: this,
            callback: function( records, operation ) {
                if( operation.wasSuccessful() ) {
                    if (records.length > 0) {
                    	var totalPoints = 0;                    	
                        _.each(records, function(record){
                        	if( !( record.raw.InvestmentCategory in investmentCategories ) ) {
                        		investmentCategories[ record.raw.InvestmentCategory ] = 0;
                        	}
                        	investmentCategories[ record.raw.InvestmentCategory ] += record.raw.LeafStoryPlanEstimateTotal;
                        	totalPoints += record.raw.LeafStoryPlanEstimateTotal;
                        },this);
                        
                        var series = [];
                        series.push( {} );
                        series[0].name = 'Investment Categories';
                        series[0].colorByPoint = true;
                        
                        series[0].data = [];
                        _.each( _.keys( investmentCategories ), function( investmentCategory ) {
                        	series[0].data.push(
                        		{
                        			name: investmentCategory,
                        			y: investmentCategories[ investmentCategory ]
                        		}
                        	);
                        }, this );
                        
						this.makeChart( series );
                    }
                    else if(records.length === 0 && this.features.length === 0){
                        this.showNoDataBox();   
                    }
                }
            }
        });
    },
    
    makeChart:function( series ){
        var chart = this.add({
            xtype: 'rallychart',
            chartConfig: {
                chart:{
                    type: 'pie'
                },
                title:{
                    text: 'Investment Category Spend'
                },
                tooltip: {
					pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
				},
                plotOptions: {
                    pie: {
						allowPointSelect: true,
						cursor: 'pointer',
						dataLabels: {
							enabled: true,
							format: '<b>{point.name}</b>: {point.percentage:.1f} %'
						}
					}
                }
            },
                            
            chartData: {
                series: series
            }
        });
        
        // Workaround bug in setting colors - http://stackoverflow.com/questions/18361920/setting-colors-for-rally-chart-with-2-0rc1/18362186
        chart.setChartColors( [ '#005EB8', '#FF8200', '#FAD200', '#7CAFD7', '#F6A900', '#FFDD82' ] );
        
        this._myMask.hide();
    },
    
    showNoDataBox:function(){
        this._myMask.hide();
		this.add({
			xtype: 'label',
			text: 'There is no data. Check if there are iterations in scope and work items with PlanEstimate assigned for iterations'
        });
    }
});