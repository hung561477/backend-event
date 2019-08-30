const formatDateTime = (date: any) => {
    return date.toISOString().replace(/([^T]+)T([^\.]+).*/g, '$1 $2');
};

export default  formatDateTime;
